const mongoose = require('mongoose');

const {Schema,model} = mongoose;

const GamingObjectSchema = new Schema({
    userId:{
        type:String,
        default:''
    },
    userChannelId:{
        type:String,
        default:''
    },
    handlerMessageId:{
        type:String,
        default:''
    },
    gameMessageId:{
        type:String,
        default:''
    },
    userName:{
        type:String,
        default:''
    },
    stage:{
        type:String,
        default:'0'
    },
    score:{
        type:String,
        default:'0'
    },
    bestScore:{
        type:String,
        default:'0'
    },
    isWritable:{
        type:Boolean,
        default:false,
    },
    active:{
        type:Boolean,
        default:true
    }

});

const GamingObjectModel = model('gamingobject',GamingObjectSchema);

module.exports = GamingObjectModel;
