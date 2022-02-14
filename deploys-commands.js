const {SlashCommandBuilder} = require('@discordjs/builders');
const {REST} = require('@discordjs/rest');
const {Routes} = require('discord-api-types/v9');
const {Token, clientId, guildId} = require('./config.json');

const commands = [
    new SlashCommandBuilder().setName('solo').setDescription('start a solo section'),
    new SlashCommandBuilder().setName('topranks').setDescription('first top 10 users'),
    new SlashCommandBuilder().setName('multi').setDescription('start a multi player section')
    .addStringOption( option => 
        option.setName('username')
        .setDescription('enter user name')
    )
    .addStringOption(option =>
        option.setName('id')
        .setDescription('enter a user id')
    )
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(Token);

rest.put(Routes.applicationGuildCommands(clientId,guildId), {body:commands})
.then(()=>console.log('suucces register command'))
.catch(err => console.log(err))