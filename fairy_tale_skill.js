'use strict';
var Alexa = require('alexa-sdk');
var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient({region: 'ap-northeast-1'});

//=========================================================================================================================================
// スキル定義
//=========================================================================================================================================
var APP_ID = process.env.ALEXA_APP_ID;
var SKILL_NAME = "子供向け童話";
var HELP_MESSAGE = "童話を聞きたい時は「童話」と、終わりたい時は「おしまい」と言ってください。どうしますか？";
var HELP_REPROMPT = "どうしますか？";
var STOP_MESSAGE = "おしまい";

//=========================================================================================================================================
// データ定義
//=========================================================================================================================================
// 童話の最大件数を取得して、ランダム、次、前の童話を開始する
var startFairyTale = function (index, type) {
    // データ取得
    var params = {
        TableName: 'fairy_tale_master_tbl',
        Key: {
            'key' : 'fairy_tale_max'
        }
    };
    dynamo.get(params, function(err, data) {
        if (err){
            console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded.");
            var fairyTaleMax = data.Item.value;
            
            if (type === 'default') {                // ランダムの童話
                index = Math.floor(Math.random() * fairyTaleMax + 1);
                console.log("index default:", index);
        	} else if (type === 'next') {            // 次の童話
                console.log("index before:", index);
                if (index === fairyTaleMax) {
                	index = 1;
                } else {
                	index++;
                }
                console.log("index after:", index);
        	} else if (type === 'previous') {        // 前の童話
                console.log("index before:", index);
                if (index === 1) {
                	index = fairyTaleMax;
                } else {
                	index--;
                }
                console.log("index after:", index);
            } else if (type === 'startover') {       // 最初からやり直す
                console.log("index startover:", index);
            }
            // 童話を開始
            showFairyTale(index);
        }
    });
}

var obj;
// 童話を取得して、スピーチを開始する
var showFairyTale = function (index) {
    // 童話番号をDBに保存
    obj.attributes['index'] = index;
    // データ取得
    var params = {
        TableName: 'fairy_tale_tbl',
        Key: {
            'index' : index
        }
    };
    dynamo.get(params, function(err, data) {
        if (err){
            console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded.");
            // 読み上げ速度80%でメッセージに設定
            var speechOutput = "<prosody rate='80%'>" + data.Item.title + "。" + data.Item.author + "。" + data.Item.content + STOP_MESSAGE + "</prosody>";
            // スピーチを開始
            obj.emit(':ask', speechOutput, HELP_REPROMPT);
        }
    });
};
//=========================================================================================================================================
// イベントハンドラ
//=========================================================================================================================================
exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.dynamoDBTableName = 'fairy_tale_skill_tbl';
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {              // 子供向け童話を開いて
        this.emit('GetFairyTaleIntent');
    },
    'GetFairyTaleIntent': function () {			// お話、童話、(お話|童話)を聞かせて、童話を話して
        // 現在のオブジェクトを保存
        obj = this;
        // 童話を開始
        startFairyTale(1, 'default');
    },
    'AMAZON.HelpIntent': function () {			// ヘルプ、どうすればいいの、使い方を教えて
        this.emit(':ask', HELP_MESSAGE, HELP_REPROMPT);
    },
    'AMAZON.CancelIntent': function () {		// おしまい、終了
        this.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.StopIntent': function () {          // ストップ、止めて、中止
        this.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.NextIntent': function () {			// 次、ネクスト
        // 童話番号をDBから取得
        var index = this.attributes['index'];
        // 現在のオブジェクトを保存
        obj = this;
        // 次の童話を開始
        startFairyTale(index, 'next');
    },
    'AMAZON.PreviousIntent': function () {		// 前、前へ
        // 童話番号をDBから取得
        var index = this.attributes['index'];
        // 現在のオブジェクトを保存
        obj = this;
        // 前の童話を開始
        startFairyTale(index, 'previous');
    },
    'AMAZON.StartOverIntent': function () {		// 最初からやり直して、最初に戻って
        // 童話番号をDBから取得
        var index = this.attributes['index'];
        // 現在のオブジェクトを保存
        obj = this;
        // 最初からやり直して開始
        startFairyTale(index, 'startover');
    },
    'SessionEndedRequest': function () {		// 明示的なセッション終了。定義必須。
        // Nothing to do
    }
};

