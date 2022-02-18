const Discord = require('discord.js');
const {
    MessageEmbed, MessageAttachment,MessageActionRow,
    MessageButton,MessageSelectMenu
} = Discord;
const {Client,Intents} = Discord;
const {Token,channelId} = process.env;
const wait = require('util').promisify(setTimeout);
const mongoose = require('mongoose');
const GamingObjectModel = require('./models/gamingObject');
const MultiPlayerModel = require('./models/multiPlayer');
const { url } = require('inspector');
let gameImages = arrayMixer(require('./images-info.json'));
const EventEmitter = require('events');
const eventEmitter = new EventEmitter;

//connect to the db
/*mongoose.connect(
    'mongodb://localhost/gaming', 
    {
        useNewUrlParser:true, 
        useUnifiedTopology:true
    }

).then(()=>{console.log('db connected')})
.catch(err => console.log(err));*/

mongoose.connect(
    'mongodb+srv://aymen:super20191397@mycluster.os7ff.mongodb.net/gaming?retryWrites=true&w=majority'
).then(() => {
    console.log('connected success')
}).catch(err => console.log(err))


//decalre needed variables ////////////////////////////////////////////////////
let id,//id for the game section channel
lastInteraction;

//create a class to be used in create global key variables for each multiplaying room 
let soloRooms = {};
class SoloRoom {
    constructor(obj){
        this.obj = obj;
        this.soloSending = 0,
        this.isWritebale = true,
        this.timer = 1,
        this.timerInterval
    }
}

//create a class to be used in create global key variables for each multiplaying room 
let globalGamingRooms = {};
class CreateRoom {
    constructor(){
        this.isWritebale = true,
        this.sendingStage=1,
        this.timer = 1,
        this.timerInterval,
        this.answered = false,
        this.hostAllowed = true,
        this.gestAllowed = true
    }
}




//set our discord client
const client = new Client({ 
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
  });


//handling bot events
client.once('ready', ()=>{
    console.log('Your quizeAnime Bot is ready');
})

//handling slash commands and buttons
client.on('interactionCreate', async interaction =>{
    //handling slash command //////////////////////////////////////////////////////////////////////
    if(interaction.isCommand()){

        if(interaction.commandName === 'help'){////////////////////

            //defere reply
            await interaction.deferReply({ephemeral:true});
            console.log(interaction.user.avatarURL())
            await interaction.editReply({
                embeds:[
                    new MessageEmbed()
                    .setAuthor({
                        name:interaction.user.username,
                        iconURL:interaction.user.avatarURL()
                    })
                    .setColor('BLURPLE')
                    .setThumbnail('attachment://profile.jpg')
                    .setFields([
                        {
                            name:".Prefix to this channel " + " 'Not Available'",
                            value: 'support direct messages and slash commands',
                            inline:false
                        },
                        {
                            name:".Total commands 4 | Usable by you (here): 4",
                            value: '\u200B',
                            inline:false
                        },
                        {
                            name:"|Command",
                            value: '\u200B',
                            inline:true
                        },
                        { name: '\u200B', value: '\u200B', inline:true},
                        {
                            name:'|Description',
                            value: '\u200B',
                            inline:true
                        },
                        {
                            name:'help',
                            value: '\u200B',
                            inline:true
                        },
                        { name: '\u200B', value: '\u200B', inline:true},
                        {
                            name:'display quizAnimeGame message',
                            value: '\u200B',
                            inline:true
                        },
                        {
                            name:'solo',
                            value: '\u200B',
                            inline:true
                        },
                        { name: '\u200B', value: '\u200B', inline:true},
                        {
                            name:'start playing quizAnimeGame',
                            value: '\u200B',
                            inline:true
                        },
                        {
                            name:'multi',
                            value: '\u200B',
                            inline:true
                        },
                        { name: '\u200B', value: '\u200B', inline:true},
                        {
                            name:'start a multiPlayer game round',
                            value: '\u200B',
                            inline:true
                        },
                        {
                            name:'topranks',
                            value: '\u200B',
                            inline:true
                        },
                        { name: '\u200B', value: '\u200B', inline:true},
                        {
                            name:'display top 10 players in the server',
                            value: '\u200B',
                            inline:true
                        },
                    ])
                ],
                files:[
                    new MessageAttachment('profile.jpg')
                ]
            })


        }else if(interaction.commandName === 'solo'){///////////////////////////////////////

            //defere reply
            await interaction.deferReply({ephemeral:true});

            if(interaction.channel.id === channelId){
            
                //check if the user already has an opened game section'gaming object'
                const check = await GamingObjectModel.findOne({
                    userId:interaction.user.id
                })

                if(check === null){
                        
                    //create gaming object
                    let gamingObject = await new GamingObjectModel(
                        {   
                            userName:interaction.user.username,
                            userId: interaction.user.id,
                            stage:'0',
                            score:'0',
                            bestScore:'0'
                        }
                    ).save();

                    await interaction.editReply(
                        {
                            content:'hello ' + interaction.user.username,
                            components:[startButton]
                        }
                    )

                }else{

                    if(check.active === true){

                        await interaction.editReply({
                            content:'there is already a game round'
                        });

                    }else if(check.active === false){

                        check.active = true;
                        await check.save();
                        await interaction.editReply(
                            {
                                content:'hello ' + interaction.user.username,
                                components:[startButton]
                            }
                        )

                    }
                }
                
            }else{

                await interaction.editReply({
                    content:'This command is not allowed in this channel',
                });

            };
           
        }else if(interaction.commandName === 'multi'){//////////////////////////////

            if(interaction.options['_hoistedOptions'].length === 0){

                await interaction.deferReply();
            
                //createa select menu options
                let menuOptions=[];
                let allMembers = [...interaction.guild.members.cache.values()];
                allMembers.forEach(member => {  
                    if(!member.user.bot){
                        let obj = {
                            label:`${member.user.username}`,
                            description:`${member.user.id}`,
                            value:`${member.user.id}`
                        };
                        menuOptions.push(obj);
                    };
                });

                //send the multiplayer message
                await interaction.editReply({
                    content:'Invite a rival',
                    components:[
                        new MessageActionRow().addComponents(
                            new MessageSelectMenu().setCustomId('inviterival')
                            .setPlaceholder('select a rival')
                            .setMaxValues(1)
                            .setMinValues(1)
                            .addOptions(menuOptions)
                        )
                    ],
                    ephemeral:true
                })

                
            }else{

                let targetUser;
                let matchedWhat;
                if(interaction.options['_hoistedOptions'][0].name === 'id'){//handle id

                    //find user with matched id
                    let targetId = interaction.options['_hoistedOptions'][0].value;
                    targetUser = interaction.guild.members.cache.get(targetId);
                    matchedWhat = 'id';

                }else if(interaction.options['_hoistedOptions'][0].name === 'username'){//handle username

                    //find user with matched userName
                    let targetName = interaction.options['_hoistedOptions'][0].value;
                    targetUser = [...interaction.guild.members.cache.filter(member => {
                        if(member.user.username === targetName) return true
                    }).values()][0];
                    matchedWhat = 'username'

                }

                if(targetUser === undefined){

                    interaction.reply({
                        content:`We can not find a user with a matched ${matchedWhat}`,
                        ephemeral:true,
                        fetchReply:true
                    }).then(async (rep) => {
                        await wait(15000);
                        await rep.delete();
                    })

                }else{
                    interaction.deferReply();//defere the reply

                    //create invitation (focusing invitation)
                    let newInvitation = await interaction.channel.createInvite({
                        maxUses: 1,
                        unique: true, 
                        maxAge: 3600 
                    });
                    
                    //create multiplayer channel
                    let channel = await interaction.guild.channels.create('multiplayer-section',{
                        type:'text',
                        userLimit:3,
                        permissionOverwrites:[
                            {
                                id:interaction.guild.roles.everyone,
                                deny:['VIEW_CHANNEL']//overwrite the everyone permission 
                            },
                            {
                                id:client.application.id,
                                allow:['VIEW_CHANNEL']
                            },
                            {
                                id:interaction.user.id,
                                allow:['VIEW_CHANNEL']
                            },
                            {
                                id:targetUser.id,
                                allow:['VIEW_CHANNEL']
                            }
                        ],
                        parent:(function(){
                            let parentChannel;
                            let allChannels = 
                            [...interaction.guild.channels.cache.values()]
                            for(let i=0; i<allChannels.length; i++){
                                if(allChannels[i].name === 'multiPlayer' && allChannels[i].type === 'GUILD_CATEGORY'){
                                    parentChannel = allChannels[i];
                                    break;
                                };
                            };
                            return parentChannel

                        })()
                    });

                    //create multiPlayer gaming object
                    let multiGamingObject = await new MultiPlayerModel({
                        channelId:channel.id,
                        userName:interaction.user.username,
                        gestUserName:targetUser.user.username,
                        hostId:interaction.user.id,
                        gestId:targetUser.user.id
                    }).save();

                    //create globalgaming room
                    globalGamingRooms[channel.id] = new CreateRoom();

                    //send reply
                    interaction.editReply({
                        content:'please join you multiplayer game section',
                        ephemeral:true,
                        fetchReply:true
                    }).then(rep=>{
                        setTimeout(async function(){
                            await rep.delete();
                        },15000);
                    });

                    //send the invitation
                    await targetUser.send({
                        content:
                        `Multiplayer invitation by <@${interaction.user.id}> join: http://discord.gg/${newInvitation.code}`
                    })

                    //send message in the multiplayer channel
                    await channel.send({
                        content:'Start the game',
                        components:[multiPlayStartButton]
                    })
                }

            }

        }else if(interaction.commandName === 'topranks'){

            await interaction.deferReply({ephemeral:true})

            let allMembers = (await GamingObjectModel.find({})).sort((first,second)=>{
                return Number(second.bestScore) - Number(first.bestScore)
            })
            if(allMembers !== null && allMembers !== undefined){
                
                //send the rank embed
                await interaction.editReply({
                    ephemeral:true,
                    embeds:[
                        new MessageEmbed().setColor('DARK_ORANGE')
                        .setThumbnail('attachment://podium.jpg')
                        .setTitle('Top 10 players')
                        .setFields((function(){
                            let arr = []
                            for(let i=0; i<10; i++){
                                if(allMembers[i] !== undefined){
                                    let userObj = {
                                        name:'#' + (i+1) + '. ' + allMembers[i].userName,
                                        value:`Best_Score: ${allMembers[i].bestScore}`,
                                        inline:false
                                    };
                                    arr.push(userObj);
                                };
                            };
                            return arr
                        })())
                    ],
                    files:[new MessageAttachment('podium.jpg')],
                    fetchReply:true
                })
            }
        }


    //handling buttons ////////////////////////////////////////////////////////////////////////////
    }else if(interaction.isButton()){

        //mix game images array
        gameImages = arrayMixer(gameImages);

        //start button click
        if(interaction.component.customId === 'start'){//////////////////////////////

            //defere update
            await interaction.deferUpdate({ephemeral:true});

            await interaction.editReply({
                content:'Game is loading...',
                components:[disabledStartButton]
            });

            //get the gamingObject
            let gamingObject = await GamingObjectModel.findOne(
                {
                    userId:interaction.user.id
                }
            );

            //create a soloRoom (contains needed variables)
            soloRooms[interaction.user.id] = new SoloRoom(interaction);
            

            //update the button to end's button and send the game embed message
            
            interaction.editReply({
                content:'Playing...',
                embeds:[
                    new MessageEmbed().setColor('AQUA')
                    .setTitle('Quiz Anime Game')
                    .setFields([
                        {
                            name:'Score',
                            value:'you score is: ' + gamingObject.score,
                            inline:true
                        },
                        {
                            name:'Best score',
                            value:'Your best score is: ' + gamingObject.bestScore,
                            inline:true
                        }
                    ])
                    .setImage('attachment://' +
                        gameImages[Number(gamingObject.stage)].name
                    )
                    .setFooter({
                        text:'who is this anime character? tell us in a message.'
                    })
                ],
                files:[
                    new MessageAttachment(
                        gameImages[Number(gamingObject.stage)].name
                    )
                ],
                components:[endButton]
            }).then(async reply => {
                //start timer
                soloTimer(interaction.user.id,gamingObject)
    
                gamingObject.gameMessageId = reply.id;
                await gamingObject.save();
            })
            
                
               

        }else if(interaction.component.customId === 'playagain'){///////////////////////
            
            //defere reply
            await interaction.deferUpdate({ephemeral:true});

            //assign the ninteraction to global key variables obj 
            soloRooms[interaction.user.id].obj = interaction;
            
            //get the gaming object for this user
            let gamingObject = await GamingObjectModel.findOne(
                {
                    userId:interaction.user.id
                }
            );
            gamingObject.score = '0';
            gamingObject.stage = '0';
            gamingObject = await gamingObject.save();

            //mix the game images array 
            gameImages = arrayMixer(gameImages);

            //update game message
            await interaction.editReply({
                content:'Game is loading...',
                embeds:[],
                files:[],
                components:[],
                ephemeral:true
            })

            await interaction.editReply({
                content:'Playing...',
                embeds:[
                    new MessageEmbed().setColor('AQUA')
                    .setTitle('Quiz Anime Game')
                    .setFields([
                        {
                            name:'Score',
                            value:'you score is: ' + gamingObject.score,
                            inline:true
                        },
                        {
                            name:'Best score',
                            value:'Your best score is: ' + gamingObject.bestScore,
                            inline:true
                        }
                    ])
                    .setImage('attachment://' +
                        gameImages[Number(gamingObject.stage)].name
                    )
                    .setFooter({
                        text:'who is this anime character? tell us in a message.'
                    })
                ],
                files:[
                    new MessageAttachment(
                        gameImages[Number(gamingObject.stage)].name
                    )
                ],
                components:[endButton],
            }).then(async ()=> {

                //allow user to send a message 'his answer'
                soloRooms[interaction.user.id].isWritebale = true;
                gamingObject.isWritable = true;
                gamingObject = await gamingObject.save();

                //start timer
                soloTimer(interaction.user.id,gamingObject)
            })
            

        }else if(interaction.component.customId === 'end'){///////////////////////////////

            await interaction.deferUpdate({ephemeral:true});
            await interaction.editReply({
                content:'Game closed...',
                embeds:[],
                components:[],
                components:[]
            });

            //get the gaming object for this user
            let gamingObject = await GamingObjectModel.findOne(
                {
                    userId:interaction.user.id
                }
            );
            gamingObject.score = '0';
            gamingObject.stage = '0';
            gamingObject.active = false;


            //remove it from the gaming object
            gamingObject.gameMessageId = '';
            
            //mix the array
            gameImages = arrayMixer(gameImages);

            //remove the global key variables object
            delete soloRooms[interaction.user.id]

            //prevent user from sending message in this channel
            gamingObject.isWritable = false;
            gamingObject = await gamingObject.save();


        }else if(interaction.component.customId === 'multiplaystart'){/////////////////////////////

            //disabled button after click and store the interaction id for later use 
            await interaction.update({
                content:'Game is loading...',
                components:[disabledMultiPlayStartButton]
            });
        
            //check if both player are onligne either it will not start
            let checkPre = [];
            [...interaction.channel.members.values()].forEach(player => {
                if(!player.user.bot){
                    player.presence ? checkPre.push(true) : checkPre.push(false);
                };
            });
            let chhh = false
            if(/*checkPre.includes(false)*/chhh){

                //get the interaction
                let inter = [...interaction.channel.messages.cache.values()][0];

                //reply 
                inter.reply('Both player must be present to start the game').then(async rep => {
                    await wait(3000);
                    await rep.delete();
                })

                //edit the button to be clickable
                await inter.edit({
                    content:'Start the game',
                    components:[multiPlayStartButton]
                })

            }else{

                //get the key variables for this channel
                let {
                    sendingStage,isWritebale,timer,timerInterval,
                    gestAllowed,hostAllowed,answered
                } = globalGamingRooms[interaction.channel.id];

                //get the multiplay gaming object
                let multiGamingObject = await MultiPlayerModel.findOne({
                    channelId: interaction.channel.id
                });

                //get the handling message 
                let inter = [...interaction.channel.messages.cache.values()][0];
                
                //send the game's embed
                interaction.followUp({
                    embeds:[
                        new MessageEmbed().setColor('AQUA')
                        .setTitle('Quiz Anime Game')
                        .setFields([
                            {
                                name: multiGamingObject.userName,
                                value:'your score is: ' + multiGamingObject.hostScore,
                                inline:true
                            },
                            {
                                name: multiGamingObject.gestUserName,
                                value: 'your score is: ' + multiGamingObject.gestScore,
                                inline:true
                            }
                        ])
                        .setImage('attachment://' +
                            gameImages[Number(multiGamingObject.stage)].name
                        )
                        .setFooter({
                            text:'who is this anime character? tell us in a message.'
                        })
                    ],
                    files:[
                        new MessageAttachment(
                            gameImages[Number(multiGamingObject.stage)].name
                        )
                    ]
                }).then(follow => {

                    //edit the handling message and save id 
                    inter.edit({
                        content:'Playing...',
                        components:[multiPlayEndButton]
                    }).then(async res => {
                        multiGamingObject.handlingMessageId = res.id
                        await multiGamingObject.save()
                    });

                    //store the id of the embed game message
                    multiGamingObject.gameMessageId = follow.id;

                    //start the timer
                    startTimer(interaction.channel.id,multiGamingObject,interaction);
                })

                
                
                //allow handling sended messages
                multiGamingObject.isWritable = true;
                multiGamingObject = await multiGamingObject.save();
            
            }


        }else if(interaction.component.customId === 'multiplayagain'){/////////////////////////////

            //get the gaming object for this user
            let multiGamingObject = await MultiPlayerModel.findOne(
                {
                    channelId:interaction.channel.id
                }
            );
            multiGamingObject.hostscore = '0';
            multiGamingObject.gestScore = '0';
            multiGamingObject.stage = '0'
            multiGamingObject = await multiGamingObject.save();

            ////fetch the game message to update it
            let gameMessage = (await interaction.channel.messages.fetch())
            .get(multiGamingObject.gameMessageId);

            //mix the game images array 
            gameImages = arrayMixer(gameImages);

            //update game message
            let intReply;
            interaction.reply({
                content:'Game is loading...',
                fetchReply:true
            }).then(res => {
                intReply = res;
            });

            gameMessage.edit({
                embeds:[
                    new MessageEmbed().setColor('AQUA')
                        .setTitle('Quiz Anime Game')
                        .setFields([
                            {
                                name: multiGamingObject.userName,
                                value:'your score is: ' + multiGamingObject.hostScore,
                                inline:true
                            },
                            {
                                name: multiGamingObject.gestUserName,
                                value: 'your score is: ' + multiGamingObject.gestScore,
                                inline:true
                            }
                        ])
                        .setImage('attachment://' +
                             gameImages[Number(multiGamingObject.stage)].name
                        )
                        .setFooter({
                            text:'who is this anime character? tell us in a message.'
                        })
                ],
                files:[
                    new MessageAttachment(
                        gameImages[Number(multiGamingObject.stage)].name
                    )
                ],
                components:[]
            }).then(async ()=> {
                //delete reply
                intReply ? await intReply.delete():null;

                //allow user to send a message 'his answer'
                globalGamingRooms[interaction.channel.id].isWritebale = true
                multiGamingObject.isWritable = true;
                multiGamingObject = await multiGamingObject.save();

                //start timer
                startTimer(interaction.channel.id,multiGamingObject,interaction);

            })


        }else if(interaction.component.customId === 'multiplayend'){///////////////////////////////


            await interaction.update({
                content:'Game closing...',
                components:[]
            });

            //delete the channel
            await interaction.channel.delete();
            
        }





    //handling select menu ////////////////////////////////////////////////////////
    }else if(interaction.isSelectMenu()){   
        
        if(interaction.component.customId === 'inviterival'){

            interaction.deferReply();//defere the reply

            //get the targetUser
            let targetUser = interaction.guild.members.cache.get(interaction.values[0]);

            //create invitation (focusing invitation)
            let newInvitation = await interaction.channel.createInvite({
                maxUses: 1,
                unique: true, 
                maxAge: 3600 
            });

            //create multiplayer channel
            let channel = await interaction.guild.channels.create('multiplayer-section',{
                type:'text',
                userLimit:3,
                permissionOverwrites:[
                    {
                        id:interaction.guild.roles.everyone,
                        deny:['VIEW_CHANNEL']//overwrite the everyone permission 
                    },
                    {
                        id:client.application.id,
                        allow:['VIEW_CHANNEL']
                    },
                    {
                        id:interaction.user.id,
                        allow:['VIEW_CHANNEL']
                    },
                    {
                        id:targetUser.id,
                        allow:['VIEW_CHANNEL']
                    }
                ],
                parent:(function(){
                    let parentChannel;
                    let allChannels = 
                    [...interaction.guild.channels.cache.values()]
                    for(let i=0; i<allChannels.length; i++){
                        if(allChannels[i].name === 'multiPlayer' && allChannels[i].type === 'GUILD_CATEGORY'){
                            parentChannel = allChannels[i];
                            break;
                        };
                    };
                    return parentChannel

                })()
            });

            //create multiPlayer gaming object
            let multiGamingObject = await new MultiPlayerModel({
                channelId:channel.id,
                userName:interaction.user.username,
                gestUserName:targetUser.user.username,
                hostId:interaction.user.id,
                gestId:targetUser.id
            }).save();

            //create globalgaming room
            globalGamingRooms[channel.id] = new CreateRoom();
            console.log(globalGamingRooms)

            //send reply
            interaction.editReply({
                content:'please join you multiplayer game section',
                ephemeral:true,
                fetchReply:true
            }).then(rep=>{
                setTimeout(async function(){
                    await rep.delete();
                },15000);
            });

            //send the invitation
            targetUser.send({
                content:`Multiplayer invitation by <@${interaction.user.id}> 
                \njoin: http://discord.gg/${newInvitation.code}`
            }).then(res => {
                console.log('handling',res.id)
            })

            //send message in the multiplayer channel
            channel.send({
                content:'Start the game',
                components:[multiPlayStartButton]
            })
        }

    }
});

client.on('channelPinsUpdate', (data,data2)=>{
    console.log(data,data2)
})

/**************************************** message create  ***********************************************/

client.on('messageCreate', async msg=>{
    
    if(!msg.author.bot){ //this means messages which are not sent by the bot

        if(msg.channel.id === channelId){

                //get the gaming object for this user
                let gamingObject = await GamingObjectModel.findOne(
                    {
                        userId:msg.author.id
                    }
                );

                //get the global key variables
                let isWritebale,timer,timerInterval,obj;
                if(soloRooms[msg.author.id]){
                    ({isWritebale,timer,timerInterval,obj} = soloRooms[msg.author.id]);   
                }
                
                if(isWritebale || gamingObject?.isWritable){
                
                    //stop the interval
                    timerInterval ? clearInterval(timerInterval) : null;

                    //prevent user from entering any other messages untill we checke the sended message
                    soloRooms[msg.author.id].isWritebale = false;
                    soloRooms[msg.author.id].soloSending = 1;
                    gamingObject.isWritable = false;
                    gamingObject = await gamingObject.save();
                    
                    //get the correct image answer based on the gaming stage
                    let correctAnswer = gameImages[Number(gamingObject.stage)].answer;

                    //fetch the game message to update it
                    let gameMessage = (await msg.channel.messages.fetch())
                    .get(gamingObject.gameMessageId);

                    //handling user response
                    if(msg.content.toLowerCase() === correctAnswer){
                        //handling correct answer

                        //display success message
                        let msgReply = await msg.reply({
                            content:'Correct answer :smiley:',
                            ephemeral:true,
                        });

                        //update gaming object 
                        gamingObject.stage = `${Number(gamingObject.stage) + 1}`;
                        gamingObject.score = `${Number(gamingObject.score) + 1}`;
                        Number(gamingObject.score) > Number(gamingObject.bestScore) ?
                        gamingObject.bestScore = `${Number(gamingObject.bestScore) + 1}`:null;
                        gamingObject = await gamingObject.save();

                        //update the game message
                        if(Number(gamingObject.stage) <= gameImages.length -1){
                            
                            //there is still images to quiz the user for
                            obj.editReply({
                                content:'Playing...',
                                embeds:[
                                    new MessageEmbed().setColor('AQUA')
                                    .setTitle('Quiz Anime Game')
                                    .setFields([
                                        {
                                            name:'Score',
                                            value:'you score is: ' + gamingObject.score,
                                            inline:true
                                        },
                                        {
                                            name:'Best score',
                                            value:'Your best score is: ' + gamingObject.bestScore,
                                            inline:true
                                        }
                                    ])
                                    .setImage('attachment://' +
                                        gameImages[Number(gamingObject.stage)].name
                                    )
                                    .setFooter({
                                        text:'who is this anime character? tell us in a message.'
                                    })
                                ],
                                files:[
                                    new MessageAttachment(
                                        gameImages[Number(gamingObject.stage)].name
                                    )
                                ],
                                components:[endButton],
                                ephemeral:true
                            }).then(async ()=>{
                                //delete the user sended response message and reply
                                await msgReply.delete();
                                await msg.delete();
                            
                                //allow user to send a message 'his answer'
                                soloRooms[msg.author.id].isWritebale = true;
                                soloRooms[msg.author.id].soloSending = 0;
                                gamingObject.isWritable = true;
                                gamingObject = await gamingObject.save();

                                //start timer
                                soloTimer(msg.author.id,gamingObject)

                                
                            })

                        }else{

                            //he finishs the game
                            obj.editReply({
                                content:'Game finished',
                                embeds:[
                                    new MessageEmbed().setColor('AQUA')
                                    .setTitle('Quiz Anime Game')
                                    .setFields([
                                        {
                                            name:'Score',
                                            value:'you score is: ' + gamingObject.score,
                                            inline:true
                                        },
                                        {
                                            name:'Best score',
                                            value:'Your best score is: ' + gamingObject.bestScore,
                                            inline:true
                                        }
                                    ])
                                    .setImage('attachment://finish.jpg')
                                ],
                                files:[
                                    new MessageAttachment('finish.jpg')
                                ],
                                components:[againButton]

                            }).then(async ()=>{
                                //delete the user sended response message and reply
                                await msgReply.delete();
                                await msg.delete()
                            })
                        }
                        
                        
                    }else{
                        //handling wrong answer
                        //display wrong message
                        await obj.editReply({
                            content:"Wrong answer :pensive:\nGame's round end",
                            files:[],
                            embeds:[],
                            components:[]
                        });

                        //update gaming object 
                        gamingObject.stage = '0';
                        gamingObject.score = '0';
                        gamingObject.active = false
                        gamingObject.isWritable = false;
                        gamingObject = await gamingObject.save();
                        
                        //mix the array before starts again
                        gameImages = arrayMixer(gameImages);

                        //delete global key variables object
                        delete soloRooms[msg.author.id]

                        await wait(3000);

                        //delete the user sended response message
                        await msg.delete();
    
                        
                    }

                }else{
                    //delete message
                    msg.delete();
                }
                
        }else{

            if(msg.channel.parent !== null && msg.channel.id !== channelId){

                //handling multi playing section messages /////////////////////

                //get all the needed key variables from globalGamingRooms
                let {
                    sendingStage,isWritebale,timer,timerInterval,
                    gestAllowed,hostAllowed,answered
                } = globalGamingRooms[msg.channel.id];
                
                //get the multi playing game object
                let multiGamingObject = await MultiPlayerModel.findOne({
                    channelId: msg.channel.id
                });

                //get the correct image answer based on the gaming stage
                let correctAnswer = gameImages[Number(multiGamingObject.stage)]?.answer;

                //fetch the game message to update it
                let gameMessage = (await msg.channel.messages.fetch())
                .get(multiGamingObject.gameMessageId);
            
                if(multiGamingObject.isWritable || isWritebale){

                    //handling host user answer
                    if(msg.author.id === multiGamingObject.hostId){
                        console.log(sendingStage)
                        //handling message as first message
                        if(sendingStage === 1){
                            
                            //increase sending stage by one on message received
                            globalGamingRooms[msg.channel.id].sendingStage += 1;

                            //update key variables
                            multiGamingObject.hostAllowed = false;
                            globalGamingRooms[msg.channel.id].hostAllowed = false;

                            //only correct answer
                            if(msg.content.toLowerCase() === correctAnswer){
                                
                                //update key variables
                                globalGamingRooms[msg.channel.id].sendingStage += 1;
                                globalGamingRooms[msg.channel.id].answered = true;

                                //send success message
                                await msg.channel.send(`Correct answer by ${msg.author.username} :smiley:`);

                                //update multigamingObject and key variables
                                answered = true;
                                hostAllowed = false;
                                multiGamingObject.stage = `${Number(multiGamingObject.stage) + 1}`;
                                multiGamingObject.hostScore = `${Number(multiGamingObject.hostScore) + 1}`;
                                multiGamingObject.answered = true;

                            }else{
                                await msg.reply('Bad answer :pensive:');
                            }
                            multiGamingObject = await multiGamingObject.save();


                        }else if(sendingStage === 2){
                            
                            if(!answered && hostAllowed){
                                
                                //update key variables
                                sendingStage += 1;
                                isWritebale = false;
                                multiGamingObject.isWritable = false;
                                multiGamingObject.hostAllowed = false;

                                if(msg.content.toLowerCase() === correctAnswer){
        
                                    //send success message
                                    await msg.channel.send(`Correct answer by ${msg.author.username} :smiley:`);
        
                                    //update multigamingObject
                                    multiGamingObject.stage = `${Number(multiGamingObject.stage) + 1}`;
                                    multiGamingObject.hostScore = `${Number(multiGamingObject.hostScore) + 1}`;
        
        
                                }else{
                                    //wrong answer
                                    //send success message
                                    await msg.reply(`Bad answers :pensive:`);
        
                                    //update multigamingObject
                                    multiGamingObject.stage = `${Number(multiGamingObject.stage) + 1}`;
                                }
                                multiGamingObject = await multiGamingObject.save();

                            }
                            
                        }else if(sendingStage === 3) msg ? await msg.delete():null;

                    }else if(msg.author.id === multiGamingObject.gestId){//handling gest user answer
                        console.log('gestsender',sendingStage)
                        //handling message a first message
                        if(sendingStage === 1){

                            //increase sending stage by one one message received
                            sendingStage += 1

                            //update key variable
                            multiGamingObject.gestAllowed = false;

                            //only correct answer
                            if(msg.content.toLowerCase() === correctAnswer){

                                //update key variables
                                sendingStage += 1;
                                answered = true;

                                //send success message
                                await msg.channel.send(`Correct answer by ${msg.author.username} :smiley:`);

                                //update multigamingObject and key variables
                                gestAllowed = false;
                                answered = true;
                                multiGamingObject.stage = `${Number(multiGamingObject.stage) + 1}`;
                                multiGamingObject.hostScore = `${Number(multiGamingObject.gestScore) + 1}`;
                                multiGamingObject.answered = true;
                                multiGamingObject = await multiGamingObject.save();

                            }
                            else{
                                await msg.reply('Bad answer :pensive:')
                            }

                        }else if(sendingStage === 2){
                            console.log('before allowed')
                            console.log(!answered,!multiGamingObject.answered)
                            if(!answered && multiGamingObject.gestAllowed){
                                console.log('allowed')
                                //update key variables
                                sendingStage += 1;
                                isWritebale = false;
                                multiGamingObject.isWritable = false;

                                if(msg.content.toLowerCase() === correctAnswer){

                                    //send success message
                                    await msg.channel.send(`Correct answer by ${msg.author.username} :smiley:`);

                                    //update multigamingObject
                                    multiGamingObject.stage = `${Number(multiGamingObject.stage) + 1}`;
                                    multiGamingObject.gestScore = `${Number(multiGamingObject.gestScore) + 1}`;

                                }else{
                                    //wrong answer

                                    //send success message
                                    await msg.reply(`Bad answers :pensive:`);

                                    //update multigamingObject
                                    multiGamingObject.stage = `${Number(multiGamingObject.stage) + 1}`;
                                
                                }
                                multiGamingObject = await multiGamingObject.save();

                            }else console.log('not allowed')
                        }else if(sendingStage === 3) msg ? await msg.delete() :null;
                    }

                }else{
                    msg ? await msg.delete():null;
                }
            }
        }
    }


    //just for multiplayer section
    if(msg.channel.parent !== null){

        //get all the needed key variables from globalGamingRooms
        let {
            sendingStage,isWritebale,timer,timerInterval,
            gestAllowed,hostAllowed,answered
        } = globalGamingRooms[msg.channel.id];
        console.log(sendingStage,'from update')
        //get the multi playing game object
        let multiGamingObject = await MultiPlayerModel.findOne({
            channelId: msg.channel.id
        });

        //fetch the game message to update it
        let gameMessage = (await msg.channel.messages.fetch())
        .get(multiGamingObject.gameMessageId);

        //update game message
        if(Number(multiGamingObject.stage) <= gameImages.length -1){

            if(sendingStage === 3){

                globalGamingRooms[msg.channel.id].sendingStage += 1 //to prevent leaked access
                console.log('update game message')
                //there is still images to quiz the user for
                gameMessage.edit({
                    embeds:[
                        new MessageEmbed().setColor('AQUA')
                        .setTitle('Quiz Anime Game')
                        .setFields([
                            {
                                name: multiGamingObject.userName,
                                value:'your score is: ' + multiGamingObject.hostScore,
                                inline:true
                            },
                            {
                                name: multiGamingObject.gestUserName,
                                value: 'your score is: ' + multiGamingObject.gestScore,
                                inline:true
                            }
                        ])
                        .setImage('attachment://' +
                            gameImages[Number(multiGamingObject.stage)].name
                        )
                        .setFooter({
                            text:'who is this anime character? tell us in a message.'
                        })
                    ],
                    files:[
                        new MessageAttachment(
                        gameImages[Number(multiGamingObject.stage)].name
                        )
                    ]
                }).then(async ()=>{

                    //delete all messages except handler and game message
                    const {gameMessageId, handlingMessageId} = multiGamingObject;
                    const fetchedMessages = (await msg.channel.messages.fetch()).filter(elem => {
                        if(elem.id != gameMessageId && elem.id != handlingMessageId) return true
                    });
                
                    await msg.channel.bulkDelete(fetchedMessages);
                    
                    //update key variables and multigamingObject
                    globalGamingRooms[msg.channel.id].answered = false;
                    globalGamingRooms[msg.channel.id].sendingStage = 1;
                    globalGamingRooms[msg.channel.id].isWritebale = true;
                    globalGamingRooms[msg.channel.id].hostAllowed = true;
                    globalGamingRooms[msg.channel.id].gestAllowed = true;
                    multiGamingObject.isWritable = true;
                    multiGamingObject.hostAllowed = true;
                    multiGamingObject.gestAllowed = true;
                    multiGamingObject = await multiGamingObject.save();

                    //start the timer
                    startTimer(msg.channel.id,multiGamingObject,msg);

                })
            }

        }else{

            if(sendingStage === 3){

                let winner = (function(){
                    const {hostScore,gestScore,userName,gestUserName} = multiGamingObject;
                    if(Number(hostScore) > Number(gestScore)) return userName
                    else if(Number(hostScore) === Number(gestScore)) return 'game end in draw :pensive:'
                    else if(Number(hostScore) < Number(gestScore))return gestUserName
                })()
                //he finishs the game
                gameMessage.edit({
                    embeds:[
                        new MessageEmbed().setColor('AQUA')
                        .setTitle(`The winner is #${winner}`)
                        .setFields([
                            {
                                name: multiGamingObject.userName,
                                value:'your score is: ' + multiGamingObject.hostScore,
                                inline:true
                            },
                            {
                                name: multiGamingObject.gestUserName,
                                value: 'your score is: ' + multiGamingObject.gestScore,
                                inline:true
                            }
                        ])
                        .setImage('attachment://winner.jpg')
                    ],
                    files:[
                        new MessageAttachment('winner.jpg')
                    ],
                    components:[multiPlayAgainButton]

                }).then(async ()=>{
                    
                    //delete all messages except handler and game message
                    const {gameMessageId, handlingMessageId} = multiGamingObject;
                    const fetchedMessages = (await msg.channel.messages.fetch()).filter(elem => {
                        if(elem.id != gameMessageId && elem.id != handlingMessageId) return true
                    });
                
                    await msg.channel.bulkDelete(fetchedMessages);
                    
                    //update key variables and multigamingObject
                    globalGamingRooms[msg.channel.id].sendingStage = 1;
                    globalGamingRooms[msg.channel.id].isWritebale = false;
                    globalGamingRooms[msg.channel.id].hostAllowed = true;
                    globalGamingRooms[msg.channel.id].gestAllowed = true;
                    multiGamingObject.isWritable = false;
                    multiGamingObject.hostAllowed = true;
                    multiGamingObject.gestAllowed = true;
                    multiGamingObject = await multiGamingObject.save();

                })
            }
        }  
    }
    
})


/******************************************* channel delete *****************************/
client.on('channelDelete', async deletedChannel => {
    if(deletedChannel.parent === null){
        await GamingObjectModel.findOneAndDelete({
            userChannelId : deletedChannel.id
        });
    }else{
        await MultiPlayerModel.findOneAndDelete({
            userChannelId:deletedChannel.id
        });
        delete globalGamingRooms[deletedChannel.id]
    };
    
});


client.login(Token)

/**********************************embeds , components , attachments ***************************/

//set the button for starting the game and stop it
const startButton = new MessageActionRow().addComponents(
    new MessageButton().setStyle('PRIMARY')
        .setCustomId('start')
    .setLabel('Start')
)
const disabledStartButton = new MessageActionRow().addComponents(
    new MessageButton().setStyle('PRIMARY')
        .setCustomId('start')
     .setLabel('Start')
    .setDisabled(true)
)
const endButton = new MessageActionRow().addComponents(
    new MessageButton().setStyle('DANGER')
        .setCustomId('end')
    .setLabel('End game')
);

const againButton = new MessageActionRow().addComponents(
    new MessageButton().setStyle('SUCCESS')
        .setCustomId('playagain')
    .setLabel('Play again')
);

//multi player start button 
const multiPlayStartButton = new MessageActionRow().addComponents(
    new MessageButton().setCustomId('multiplaystart')
    .setLabel('start')
    .setStyle('PRIMARY')
);

const disabledMultiPlayStartButton = new MessageActionRow().addComponents(
    new MessageButton().setCustomId('multiplaystart')
    .setDisabled('true')
    .setLabel('start')
    .setStyle('PRIMARY')
)

//mutli player end button
const multiPlayEndButton = new MessageActionRow().addComponents(
    new MessageButton().setCustomId('multiplayend')
    .setLabel('End game')
    .setStyle('DANGER')
);

const disabledMultiPlayEndButton = new MessageActionRow().addComponents(
    new MessageButton().setCustomId('multiplayend')
    .setDisabled('true')
    .setLabel('End game')
    .setStyle('DANGER')
)

//multi player play again button
const multiPlayAgainButton = new MessageActionRow().addComponents(
    new MessageButton().setStyle('SUCCESS')
        .setCustomId('multiplayagain')
    .setLabel('Play again')
)
const disabledmultiPlayAgainButton = new MessageActionRow().addComponents(
    new MessageButton().setStyle('SUCCESS')
        .setCustomId('multiplayagain')
    .setLabel('Play again')
    .setDisabled(true)
)



/****************************************************global actionss *****************/



















/*****************************************cusrtom functions*****************************/
//mix array elements
function arrayMixer(arr){
    arr.forEach((elem,i,array)=>{
        //set the randim indexes
        let randomOne,randomTwo;
        randomOne = Math.floor(Math.random()*arr.length);
        randomTwo = customRandomNumber(arr.length,randomOne,false);

        //get a random array elements
        let firstElem,secElem;
        firstElem = arr[randomOne];
        secElem = arr[randomTwo];

        //switch array elements
        arr[randomOne] = secElem;
        arr[randomTwo] = firstElem;
    });

    return arr // return the array after mixed the elements
};


//return a random number in specefied range that does not matche the passed one
function customRandomNumber(interval,num,ceil){

    let randomNum;
    switch (ceil) {
        case undefined:
            while(true){
                randomNum = Math.random()*interval;
                if(randomNum !== num) break
            }
            break;
        case true:
            while(true){
                randomNum = Math.ceil(Math.random()*interval);
                if(randomNum !== num) break
            }
            break;
        case false:
            while(true){
                randomNum = Math.floor(Math.random()*interval);
                if(randomNum !== num) break
            }
            break;
    };
    return randomNum
};

//game timer luncher
function startTimer(channelId,multiGamingObject,obj){
    console.log('obj',Boolean(obj))
    let {
        timer,timerInterval,isWritebale,sendingStage,
    } = globalGamingRooms[channelId];

    timerInterval = setInterval(async function(){

        timer += 1
        console.log('timer',timer)
        if(timer === 5){
            console.log('sending stage is',sendingStage)
            //reset the timer
            clearInterval(timerInterval);
            timer = 1;

            if(sendingStage < 3){
                //update key variables
                globalGamingRooms[channelId].sendingStage = 3;
                globalGamingRooms[channelId].isWritebale = false;

                //update multiGaming object
                multiGamingObject.stage = Number(multiGamingObject.stage) + 1;
                multiGamingObject = await multiGamingObject.save();

                //send time over message
                await obj.channel.send('Time is over, 5sec')
            }
        }
    },1000)
};

//solo play timer
function soloTimer(key, gamingObject){

    let {timer,isWritebale,soloSending,obj} = soloRooms[key];

    soloRooms[key].timerInterval = setInterval(async function(){

        timer +=1;
        if(timer === 10){

            //clear the interval
            clearInterval(soloRooms[key].timerInterval);
            soloRooms[key].timer = 1;

            if(soloSending < 1){

                await obj.editReply({
                    content:"Time is over, 10sec :pensive:\nGame's round end",
                    embeds:[],
                    files :[],
                    components:[]
                })

                //update gamingObject
                gamingObject.stage = 0
                gamingObject.score = 0;
                gamingObject.active = false;
                await gamingObject.save();

                //delete global key variables
                delete soloRooms[key];
            }
        }

    },1000);
}


