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


//decalre needed variables
let id,//id for the game section channel
lastInteraction,
isWritebale = true,
sendingStage=1,
timer = 1,
timerInterval,
answered = false,
hostAllowed = true,
gestAllowed = true;




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

        if(interaction.commandName === 'solo'){

            if(interaction.channel.id === channelId){

                //check if the user already has an opened game section'gaming object'
                const check = await GamingObjectModel.findOne({
                    userId:interaction.user.id
                })
                if(check === null){
                    //create a text channel for the user gaming section
                    const channel = await interaction.guild.channels.create(
                        'game-section',
                        {   
                            userLimit:2,
                            type:'text',
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
                                }
                            ]
                        }
                    );
                    
                    channel.isWritable = false; // prevent handling messages
                    id = channel.id;//get the game section channel id
                    
                        
                    //create gaming object
                    let gamingObject = await new GamingObjectModel(
                        {   
                            userName:interaction.user.username,
                            userId: interaction.user.id,
                            userChannelId : channel.id,
                            stage:'0',
                            score:'0',
                            bestScore:'0'
                        }
                    ).save();

                    (await interaction.guild.channels.fetch()).get(channel.id).send(
                        {
                            content:'hello ' + interaction.user.username,
                            components:[startButton]
                        }
                    ).then(async res => {
                        gamingObject.handlerMessageId = res.id;
                        await gamingObject.save();
                    })

                    //tell the user to join his gaming section
                    await interaction.reply({
                        content:'Please join you game section channel to start playing',
                        ephemeral:true
                    });    
                }else{
                    interaction.reply('Game section already exict, join it to start play')
                    .then(res => {
                        setTimeout(async function(){
                            await interaction.deleteReply()
                        },3000)
                    })
                }
                
            }else{
                await interaction.reply({
                    content:'This command is not allowed in this channel',
                });
                setTimeout(async function(){
                    await interaction.deleteReply();
                },10000)

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
                        content:`Multiplayer invitation by <@${interaction.user.id}> 
                        \njoin: http://discord.gg/${newInvitation.code}`
                    })

                    //send message in the multiplayer channel
                    await channel.send({
                        content:'Start the game',
                        components:[multiPlayStartButton]
                    })
                }

            }

        }else if(interaction.commandName === 'topranks'){

            let allMembers = (await GamingObjectModel.find({})).sort((first,second)=>{
                return Number(second.bestScore) - Number(first.bestScore)
            })
            if(allMembers !== null && allMembers !== undefined){
                
                //send the rank embed
                await interaction.deferReply()
                interaction.editReply({
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
                }).then(rep => {
                    setTimeout(async ()=>{
                        await rep.delete();
                    },30000)
                })
            }
        }


    //handling buttons ////////////////////////////////////////////////////////////////////////////
    }else if(interaction.isButton()){

        //mix game images array
        gameImages = arrayMixer(gameImages);

        //start button click
        if(interaction.component.customId === 'start'){//////////////////////////////

            //get the gamingObject
            let gamingObject = await GamingObjectModel.findOne(
                {
                    userId:interaction.user.id
                }
            );    

            //update the button to end button and send the game embed message
            await interaction.deferUpdate();
            interaction.editReply({

                content:'Game is loading...',
                components:[disabledStartButton]

            }).then(async inte => {

                //send the game's embed
                let gameMessage = await interaction.followUp({
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
                    ]
                })
                //store the id of the embed game message
                gamingObject.gameMessageId = gameMessage.id
                gamingObject = await gamingObject.save();

                //allow handling sended messages
                interaction.channel.isWritebale = true;
                gamingObject.isWritable = true;
                gamingObject = await gamingObject.save();
                
                //update the message and button
                await inte.edit({
                    content:'playing...',
                    components:[endButton]
                })
                
            });   

        }else if(interaction.component.customId === 'playagain'){///////////////////////
            
            //get the gaming object for this user
            let gamingObject = await GamingObjectModel.findOne(
                {
                    userId:interaction.user.id
                }
            );
            gamingObject.score = '0';
            gamingObject.stage = '0';
            gamingObject = await gamingObject.save();

            ////fetch the game message to update it
            let gameMessage = (await interaction.channel.messages.fetch())
            .get(gamingObject.gameMessageId);

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
                components:[]
            }).then(async ()=> {
                //delete reply
                await intReply.delete()

                //allow user to send a message 'his answer'
                interaction.channel.isWritebale = true;
                gamingObject.isWritable = true;
                gamingObject = await gamingObject.save();
            })
            

        }else if(interaction.component.customId === 'end'){///////////////////////////////

            let intReply = await interaction.reply({
                content:'Game closing...',
                fetchReply:true
            });

            //get the gaming object for this user
            let gamingObject = await GamingObjectModel.findOne(
                {
                    userId:interaction.user.id
                }
            );
            gamingObject.score = '0';
            gamingObject.stage = '0';

            //fetch the game message to delete it
            let gameMessage = (await interaction.channel.messages.fetch())
            .get(gamingObject.gameMessageId);
            await gameMessage.delete();

            //remove it from the gaming object
            gamingObject.gameMessageId = '';
            await gamingObject.save();

            //fetch the handler message and update it
            let handlerMessage = (await interaction.channel.messages.fetch())
            .get(gamingObject.handlerMessageId);
            handlerMessage.edit({
                content: 'hello ' + interaction.user.username,
                components: [startButton]
            }).then(async ()=> {
                await intReply.delete();
            })
            
            //mix the array
            gameImages = arrayMixer(gameImages);

            //prevent handling sended messages
            interaction.channel.isWritebale = false;
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
                })

                //start the timer
                //startTimer('interaction',interaction,multiGamingObject,gameMessage);
                
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
                isWritebale = true
                multiGamingObject.isWritable = true;
                multiGamingObject = await multiGamingObject.save();
            })


        }else if(interaction.component.customId === 'multiplayend'){///////////////////////////////

            await interaction.update({
                content:'Game closing...',
                components:[]
            });
    
            //update key variables
            isWritebale = false;
            sendingStage = 1;
            hostAllowed = true;
            gestAllowed = true;
            answered = false;
            
            //delete the gaming object
            await GamingObjectModel.findOneAndDelete(
                {
                    userId:interaction.channel.id
                }
            );

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

            await msg.delete();

        }else if(msg.channel.id !== channelId){

            if(msg.channel.parent === null){
                //get the gaming object for this user
                let gamingObject = await GamingObjectModel.findOne(
                    {
                        userId:msg.author.id
                    }
                );
                
                if(msg.channel.isWritebale || gamingObject.isWritable){

                    //prevent user from entering any other messages untill we checke the sended message
                    msg.channel.isWritebale = false;
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
                        let msgReply = await msg.reply('Correct answer :smiley:');

                        //update gaming object 
                        gamingObject.stage = `${Number(gamingObject.stage) + 1}`;
                        gamingObject.score = `${Number(gamingObject.score) + 1}`;
                        Number(gamingObject.score) > Number(gamingObject.bestScore) ?
                        gamingObject.bestScore = `${Number(gamingObject.bestScore) + 1}`:null;
                        gamingObject = await gamingObject.save();

                        //update the game message
                        if(Number(gamingObject.stage) <= gameImages.length -1){
                            
                            //there is still images to quiz the user for
                            gameMessage.edit({
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
                                ]
                            }).then(async ()=>{
                                //delete the user sended response message and reply
                                await msg.delete();
                                await msgReply.delete();

                                //allow user to send a message 'his answer'
                                msg.channel.isWritebale = true;
                                gamingObject.isWritable = true;
                                gamingObject = await gamingObject.save();

                                
                            })

                        }else{

                            //he finishs the game
                            gameMessage.edit({
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
                                await msg.delete()
                                await msgReply.delete();
                            })
                        }
                        
                        
                    }else{
                        //handling wrong answer
                    
                        //display wrong message
                        let replyMsg = await msg.reply(
                            `Wrong answer :pensive: \n
                            game will start automaticaly after 5 Sec`
                        );

                        //update gaming object 
                        gamingObject.stage = '0';
                        gamingObject.score = '0';
                        gamingObject = await gamingObject.save();
                        
                        //mix the array before starts again
                        gameImages = arrayMixer(gameImages);

                        //update the game message 'game embed'
                        gameMessage.edit({
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
                            ]
                        }).then(async()=>{

                            //allow user to send messages
                            msg.channel.isWritebale = true;
                            gamingObject.isWritable = true;
                            gamingObject = await gamingObject.save();

                            await wait(3000);

                            //delete the user sended response message
                            await msg.delete();

                            //delete the reply message
                            await replyMsg.delete();

                            
                        })  
                    }

                }else{
                    //delete message
                    msg.delete();
                }

            }else{

                //handling multi playing section messages /////////////////////
                
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
                            
                            //increase sending stage by one one message received
                            sendingStage += 1;

                            //update key variables
                            multiGamingObject.hostAllowed = false;
                            hostAllowed = false;

                            //only correct answer
                            if(msg.content.toLowerCase() === correctAnswer){
                                
                                //update key variables
                                sendingStage += 1;
                                answered = true;

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
                            
                            if(!answered && !multiGamingObject.answered && hostAllowed){
                                
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
                            if(!answered && !multiGamingObject.answered && multiGamingObject.gestAllowed){
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
                                    multiGamingObject = await multiGamingObject.save();


                                }else{
                                    //wrong answer

                                    //send success message
                                    await msg.reply(`Bad answers :pensive:`);

                                    //update multigamingObject
                                    multiGamingObject.stage = `${Number(multiGamingObject.stage) + 1}`;
                                    multiGamingObject = await multiGamingObject.save();
                                }
                            }else console.log('not allowed')
                        }else if(sendingStage === 3) msg ? await msg.delete() :null;
                    }

                    //update game message
                    if(Number(multiGamingObject.stage) <= gameImages.length -1){

                        if(sendingStage === 3){

                            sendingStage += 1 //to prevent leaked access
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
                                setTimeout(async ()=>{
                                    answered = false;
                                    sendingStage = 1;
                                    isWritebale = true;
                                    hostAllowed = true;
                                    gestAllowed = true;
                                    multiGamingObject.isWritable = true;
                                    multiGamingObject.hostAllowed = true;
                                    multiGamingObject.gestAllowed = true;
                                    multiGamingObject = await multiGamingObject.save();
                                },1000);

                                //start the timer
                                //startTimer('message',msg,multiGamingObject,gameMessage);

                            })
                        }

                    }else{

                        if(sendingStage === 3){

                            let winner = (function(){
                                const {hostScore,gestScore,gestUserName,userName} = multiGamingObject;
                                if(Number(hostScore) > Number(gestScore)) return userName
                                else return gestUserName
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
                                setTimeout(async function(){
                                    sendingStage = 1;
                                    isWritebale = false;
                                    hostAllowed = true;
                                    gestAllowed = true;
                                    multiGamingObject.isWritable = false;
                                    multiGamingObject.hostAllowed = true;
                                    multiGamingObject.gestAllowed = true;
                                    multiGamingObject = await multiGamingObject.save();
                                },1000);
                            })
                        }
                    }


                }else{
                    msg ? await msg.delete():null;


                }

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


//listen to time over event
/*eventEmitter.on('timeOver', async param=> {
    const [type, obj, multiGamingObject, gameMessage] = param;

    if(type === 'interaction'){
        //send fail message
        await obj.channel.send('Times over ::');

        //update multi playing object
        multiGamingObject.stage = Number(multiGamingObject.stage) + 1; 

        //update the game embed
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
        }).then(res => {
            startTimer(type, obj, multiGamingObject, gameMessage);
        })

    }else if(type === 'message'){
        //send fail message
        await obj.channel.send('Times over ::');

        //update multi playing object
        multiGamingObject.stage = Number(multiGamingObject.stage) + 1; 

        //update the game embed
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
        }).then(res => {
            startTimer();
        })
    }
})*/
















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
function startTimer(type,obj,multiGamingObject,gameMessage){
    timerInterval = setInterval(function(){
    timer += 1
    console.log(type)
    if(timer === 5){
        eventEmitter.emit('timeOver',[
            type, 
            obj,
            multiGamingObject,
            gameMessage
        ]);
        clearInterval(timerInterval);
        timer = 1;
    }
},1000)
};



