const { Client, Intents, MessageEmbed } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const prefix = '+'; // Ganti dengan prefix yang Anda inginkan
let snipeData = {};
let autoResponder = {
    "halo": "Halo! Apa kabar?",
    "selamat pagi": "Selamat pagi! Semoga harimu menyenangkan!"
};

// Daftar perintah slash
const commands = [
    {
        name: 'ping',
        description: 'Mengembalikan Pong!',
    },
    {
        name: 'avatar',
        description: 'Lihat avatar seseorang',
        options: [
            {
                name: 'user',
                type: 'USER',
                description: 'Pengguna yang ingin dilihat avatarnya',
                required: false,
            },
        ],
    },
    // Tambahkan perintah lainnya di sini
];

// Mendaftarkan perintah slash
const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Memulai pengisian perintah slash...');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: commands,
        });
        console.log('Perintah slash berhasil diisi!');
    } catch (error) {
        console.error(error);
    }
})();

// Event saat bot siap
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Fitur Snipe
client.on('messageDelete', message => {
    snipeData[message.channel.id] = {
        content: message.content,
        author: message.author,
        attachments: message.attachments.map(a => a.url)
    };
});

// Fitur Snipe Command
client.on('messageCreate', message => {
    if (message.author.bot) return; // Mengabaikan pesan dari bot lain

    // Perintah prefix
    if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Fitur Snipe
        if (command === 'snipe') {
            const data = snipeData[message.channel.id];
            if (!data) return message.channel.send('Tidak ada pesan yang dihapus.');

            const embed = new MessageEmbed()
                .setAuthor(data.author.tag, data.author.displayAvatarURL())
                .setDescription(data.content || 'Tidak ada teks.')
                .setImage(data.attachments[0] || null)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        }

        // Fitur Echo
        if (command === 'echo') {
            const echoMessage = args.join(' ');
            message.channel.send(echoMessage);
        }

        // Fitur Purge
        if (command === 'purge') {
            if (!message.member.permissions.has('MANAGE_MESSAGES')) return message.reply('Anda tidak memiliki izin untuk melakukan ini.');
            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('Masukkan jumlah pesan yang valid (1-100).');
            message.channel.bulkDelete(amount, true).catch(err => message.reply('Terjadi kesalahan saat menghapus pesan.'));
        }

        // Fitur Auto Responder
        for (const [trigger, response] of Object.entries(autoResponder)) {
            if (message.content.toLowerCase().includes(trigger)) {
                const
