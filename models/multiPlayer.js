const mongoose = require('mongoose');

const {Schema,model} = mongoose;

const MultiPlayerObject = new Schema({
    channelId: {type:String, default:''},
    hostId: {type:String, default:''},
    gestId:{
        type:String,
        default:''
    },
    userName:{
        type:String,
        default:''
    },
    gestUserName:{
        type:String,
        default:''
    },
    hostScore:{
        type:String,
        default:'0'
    },
    gestScore:{
        type:String,
        default:'0'
    },
    stage:{
        type:String,
        default:'0'
    },
    isWritable:{
        type:Boolean,
        default:false,
    },
    handlingMessageId:{
        type:String,
        default:''
    },
    gameMessageId:{
        type:String,
        default:''
    },
    gestAllowed:{
        type:Boolean,
        default:true
    },
    hostAllowed:{
        type:Boolean,
        default: true   
    },
    answered:{
        type:Boolean,
        default:false
    }

});

const MultiPlayerModel = model('multiplayer',MultiPlayerObject);

module.exports = MultiPlayerModel;