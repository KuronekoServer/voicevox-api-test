const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 環境変数を読み込み
require('dotenv').config();

// === 設定 ===
// VOICEVOX APIのベースURL（環境変数 VOICEVOX_URL が設定されていればそれを使用）
const BASE_URL = process.env.VOICEVOX_URL || 'http://voicevox-02:50021';

// ベンチマーク設定
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS) || 100;           // 総リクエスト数
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT_REQUESTS) || 5;        // 同時リクエスト数
const REQUEST_INTERVAL = parseInt(process.env.REQUEST_INTERVAL) || 0;         // バッチ間の待機時間（ミリ秒）

// 50文字程度の日本語文章のリスト
const SAMPLE_TEXTS = [
    'こんにちは、今日は良い天気ですね。散歩でもしませんか？',
    'プログラミングは楽しいですが、時々難しくて困ります。',
    '明日は友達と一緒に映画を見に行く予定です。楽しみです。',
    'お疲れさまでした。今日も一日、本当にありがとうございました。',
    '新しい技術を学ぶのは大変ですが、とてもやりがいがあります。',
    'コーヒーを飲みながら読書をするのが私の趣味の一つです。',
    '季節の変わり目は体調を崩しやすいので気をつけてください。',
    '家族と過ごす時間はとても大切で、心が温かくなります。',
    '新しいレストランを発見したので、今度行ってみたいと思います。',
    '音楽を聴きながら作業をすると、集中力が高まる気がします。'
];

class VoicevoxBenchmark {
    constructor() {
        this.speakers = [];
        this.results = [];
        this.nextRequestIndex = 0;
    }

    // axiosエラーを読みやすい形に整形
    formatAxiosError(error) {
        const status = error?.response?.status;
        let responseSnippet;

        const data = error?.response?.data;
        if (data != null) {
            if (Buffer.isBuffer(data)) {
                responseSnippet = data.toString('utf8').slice(0, 300);
            } else if (typeof data === 'string') {
                responseSnippet = data.slice(0, 300);
            } else {
                try {
                    responseSnippet = JSON.stringify(data).slice(0, 300);
                } catch {
                    responseSnippet = String(data).slice(0, 300);
                }
            }
        }

        return {
            status,
            responseSnippet,
            message: error?.message
        };
    }

    // 利用可能な話者一覧を取得
    async getSpeakers() {
        try {
            console.log('話者情報を取得中...');
            const response = await axios.get(`${BASE_URL}/speakers`);
            this.speakers = response.data;
            console.log(`取得した話者数: ${this.speakers.length}`);
            return this.speakers;
        } catch (error) {
            console.error('話者情報の取得に失敗:', error.message);
            throw error;
        }
    }

    // ランダムなテキストを生成
    getRandomText() {
        return SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    }

    // ランダムな話者IDを取得
    getRandomSpeaker() {
        const randomSpeaker = this.speakers[Math.floor(Math.random() * this.speakers.length)];
        // ランダムなスタイルを使用
        const randomStyle = randomSpeaker.styles[Math.floor(Math.random() * randomSpeaker.styles.length)];
        return {
            speakerId: randomStyle.id,
            speakerName: randomSpeaker.name,
            styleName: randomStyle.name
        };
    }

    // 音声クエリを生成
    async createAudioQuery(text, speakerId) {
        try {
            const response = await axios.post(`${BASE_URL}/audio_query`, null, {
                params: {
                    text: text,
                    speaker: speakerId
                }
            });
            return response.data;
        } catch (error) {
            console.error(`音声クエリ生成エラー (話者ID: ${speakerId}):`, error.message);
            throw error;
        }
    }

    // 音声合成を実行
    async synthesize(audioQuery, speakerId) {
        try {
            const response = await axios.post(`${BASE_URL}/synthesis`, audioQuery, {
                params: {
                    speaker: speakerId
                },
                responseType: 'arraybuffer'
            });
            return response.data;
        } catch (error) {
            console.error(`音声合成エラー (話者ID: ${speakerId}):`, error.message);
            throw error;
        }
    }

    // 単一の音声合成処理
    async processSingleSynthesis(index) {
        const startTime = Date.now();
        let text;
        let speaker;
        let stage = 'init';
        
        try {
            // ランダムなテキストと話者を選択
            text = this.getRandomText();
            speaker = this.getRandomSpeaker();
            
            console.log(`[${index + 1}/${TOTAL_REQUESTS}] 処理中: "${text.substring(0, 20)}..." (話者: ${speaker.speakerName} - ${speaker.styleName})`);
            
            // 音声クエリ生成
            const queryStartTime = Date.now();
            stage = 'audio_query';
            const audioQuery = await this.createAudioQuery(text, speaker.speakerId);
            const queryTime = Date.now() - queryStartTime;
            
            // 音声合成
            const synthesisStartTime = Date.now();
            stage = 'synthesis';
            const audioData = await this.synthesize(audioQuery, speaker.speakerId);
            const synthesisTime = Date.now() - synthesisStartTime;
            
            const totalTime = Date.now() - startTime;
            
            const result = {
                index: index + 1,
                text: text,
                speakerId: speaker.speakerId,
                speakerName: speaker.speakerName,
                styleName: speaker.styleName,
                queryTime: queryTime,
                synthesisTime: synthesisTime,
                totalTime: totalTime,
                success: true
            };
            
            this.results.push(result);
            console.log(`[${index + 1}/${TOTAL_REQUESTS}] 完了: ${totalTime}ms (クエリ: ${queryTime}ms, 合成: ${synthesisTime}ms)`);
            
            return result;
            
        } catch (error) {
            const totalTime = Date.now() - startTime;
            const axiosInfo = this.formatAxiosError(error);
            const speakerInfo = speaker
                ? ` (話者: ${speaker.speakerName} - ${speaker.styleName}, 話者ID: ${speaker.speakerId})`
                : '';
            const stageInfo = stage ? ` (stage: ${stage})` : '';
            const statusInfo = axiosInfo.status ? ` (HTTP ${axiosInfo.status})` : '';
            const responseInfo = axiosInfo.responseSnippet ? ` response: ${axiosInfo.responseSnippet}` : '';
            const errorMessage = `${axiosInfo.message || error.message}`;
            const result = {
                index: index + 1,
                text: text,
                speakerId: speaker?.speakerId,
                speakerName: speaker?.speakerName,
                styleName: speaker?.styleName,
                stage: stage,
                error: errorMessage,
                httpStatus: axiosInfo.status,
                responseSnippet: axiosInfo.responseSnippet,
                totalTime: totalTime,
                success: false
            };
            
            this.results.push(result);
            console.error(`[${index + 1}/${TOTAL_REQUESTS}] 失敗${stageInfo}${speakerInfo}: ${errorMessage}${statusInfo}${responseInfo}`);
            
            return result;
        }
    }

    // 複数の同時リクエストを処理
    async processBatch(batchSize = CONCURRENT_REQUESTS) {
        const promises = [];
        
        for (let i = 0; i < batchSize; i++) {
            const index = this.nextRequestIndex;
            this.nextRequestIndex += 1;
            promises.push(this.processSingleSynthesis(index));
        }
        
        return await Promise.all(promises);
    }

    // ベンチマークを実行
    async runBenchmark() {
        console.log('=== VOICEVOX API ベンチマーク開始 ===');
        console.log(`API URL: ${BASE_URL}`);
        console.log(`目標: ${TOTAL_REQUESTS}件の音声合成`);
        console.log(`同時リクエスト数: ${CONCURRENT_REQUESTS}`);
        console.log('');
        
        const overallStartTime = Date.now();
        
        try {
            // 話者情報を取得
            await this.getSpeakers();
            
            if (this.speakers.length === 0) {
                throw new Error('利用可能な話者が見つかりません');
            }
            
            console.log('');
            console.log('音声合成処理を開始...');
            
            // 設定された件数になるまでバッチ処理
            while (this.nextRequestIndex < TOTAL_REQUESTS) {
                const remaining = TOTAL_REQUESTS - this.nextRequestIndex;
                const batchSize = Math.min(CONCURRENT_REQUESTS, remaining);
                
                await this.processBatch(batchSize);
                
                // 少し間隔を空ける（サーバー負荷軽減）
                if (this.nextRequestIndex < TOTAL_REQUESTS) {
                    await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL));
                }
            }
            
            const overallEndTime = Date.now();
            const overallTime = overallEndTime - overallStartTime;
            
            // 結果を分析
            this.analyzeResults(overallTime);
            
        } catch (error) {
            console.error('ベンチマーク実行エラー:', error.message);
        }
    }

    // 結果を分析
    analyzeResults(overallTime) {
        console.log('');
        console.log('=== ベンチマーク結果 ===');
        
        const successfulResults = this.results.filter(r => r.success);
        const failedResults = this.results.filter(r => !r.success);
        
        console.log(`総処理時間: ${overallTime}ms (${(overallTime / 1000).toFixed(2)}秒)`);
        console.log(`成功: ${successfulResults.length}, 失敗: ${failedResults.length}`);
        
        if (successfulResults.length > 0) {
            const totalTimes = successfulResults.map(r => r.totalTime);
            const queryTimes = successfulResults.map(r => r.queryTime);
            const synthesisTimes = successfulResults.map(r => r.synthesisTime);
            
            const avgTotal = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;
            const avgQuery = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
            const avgSynthesis = synthesisTimes.reduce((a, b) => a + b, 0) / synthesisTimes.length;
            
            const minTotal = Math.min(...totalTimes);
            const maxTotal = Math.max(...totalTimes);

            console.log('');
            console.log('=== 平均処理時間 ===');
            console.log(`全体平均: ${avgTotal.toFixed(2)}ms`);
            console.log(`クエリ生成平均: ${avgQuery.toFixed(2)}ms`);
            console.log(`音声合成平均: ${avgSynthesis.toFixed(2)}ms`);
            console.log(`最短時間: ${minTotal}ms`);
            console.log(`最長時間: ${maxTotal}ms`);
        }
        
        if (failedResults.length > 0) {
            console.log('');
            console.log('=== エラー詳細 ===');
            failedResults.forEach(r => {
                const speakerId = r.speakerId ?? '-';
                const httpStatus = r.httpStatus ?? '-';
                const speakerName = r.speakerName ?? '-';
                const styleName = r.styleName ?? '-';
                console.log(`[${r.index}] 話者ID:${speakerId} HTTP:${httpStatus} ${speakerName}/${styleName} ${r.error}`);
            });
        }
        
        // 結果をJSONファイルに保存
        const resultFile = path.join(__dirname, 'benchmark_results.json');
        const resultData = {
            overallTime: overallTime,
            totalRequests: this.results.length,
            successfulRequests: successfulResults.length,
            failedRequests: failedResults.length,
            averageTime: successfulResults.length > 0 ? 
                successfulResults.reduce((sum, r) => sum + r.totalTime, 0) / successfulResults.length : 0,
            results: this.results
        };
        
        fs.writeFileSync(resultFile, JSON.stringify(resultData, null, 2));
        console.log('');
        console.log(`詳細結果を保存: ${resultFile}`);
    }
}

// メイン実行
async function main() {
    const benchmark = new VoicevoxBenchmark();
    await benchmark.runBenchmark();
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
    console.error('未処理の Promise 拒否:', error);
    process.exit(1);
});

if (require.main === module) {
    main().catch(console.error);
}

module.exports = VoicevoxBenchmark;
