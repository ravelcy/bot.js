npm install discord.js @discordjs/rest @discordjs/builders remove.bg google-translate-api openai ytdl-core ffmpeg-static

const { Client, IntentsBitField, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
const { removeBackgroundFromImageBase64 } = require('remove.bg');
const translate = require('google-translate-api');
const ytdl = require('ytdl-core');
const fs = require('fs');

// Konfigurasi token dan API
const BOT_TOKEN = 'YOUR_BOT_TOKEN';
const REMOVE_BG_API = 'https://api.remove.bg/v1.0/removebg';
const OPENAI_API_KEY = 'API_OPENAI';

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessageReactions,
    ],
});

// Konfigurasi OpenAI
const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

// Event ketika bot siap
client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
});

// Command Prefix
const PREFIX = '+';

// Command Handler
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Remove Background
    if (command === 'removebg') {
        if (!message.attachments.size) return message.reply('Silakan lampirkan gambar untuk dihapus latar belakangnya!');
        const attachment = message.attachments.first();
        const image = attachment.url;

        try {
            const result = await removeBackgroundFromImageBase64({
                base64img: image,
                apiKey: REMOVE_BG_API,
            });

            const buffer = Buffer.from(result.base64img, 'base64');
            fs.writeFileSync('no-bg.png', buffer);

            await message.reply({
                content: 'Latar belakang berhasil dihapus!',
                files: ['./no-bg.png'],
            });
        } catch (error) {
            console.error(error);
            message.reply('Terjadi kesalahan saat memproses gambar.');
        }
    }

    // Translate
    else if (command === 'translate') {
        const text = args.join(' ');
        if (!text) return message.reply('Silakan masukkan teks untuk diterjemahkan.');

        try {
            const result = await translate(text, { to: 'id' });
            message.reply(`**Terjemahan:**\n${result.text}`);
        } catch (error) {
            console.error(error);
            message.reply('Terjadi kesalahan saat menerjemahkan teks.');
        }
    }

    // AI
    else if (command === 'ai') {
        const prompt = args.join(' ');
        if (!prompt) return message.reply('Silakan masukkan pertanyaan atau perintah untuk AI.');

        try {
            const response = await openai.createCompletion({
                model: 'text-davinci-003',
                prompt: prompt,
                max_tokens: 150,
            });
            message.reply(response.data.choices[0].text.trim());
        } catch (error) {
            console.error(error);
            message.reply('Terjadi kesalahan saat memproses perintah AI.');
        }
    }

    // Video Downloader
    else if (command === 'download') {
        const url = args[0];
        if (!url || !ytdl.validateURL(url)) return message.reply('Silakan masukkan URL YouTube yang valid.');

        try {
            const stream = ytdl(url, { filter: 'audioandvideo', format: 'mp4' });
            const filePath = `./video.mp4`;

            stream.pipe(fs.createWriteStream(filePath));
            stream.on('end', async () => {
                await message.reply({ content: 'Berhasil mengunduh video!', files: [filePath] });
                fs.unlinkSync(filePath); // Hapus file setelah dikirim
            });
        } catch (error) {
            console.error(error);
            message.reply('Terjadi kesalahan saat mengunduh video.');
        }
    }
});

// Reaction Role Embed Button
client.on('messageCreate', async (message) => {
    if (message.content === `${PREFIX}reaction-role`) {
        const embed = new EmbedBuilder()
            .setTitle('Pilih Role Anda!')
            .setDescription('Klik tombol di bawah untuk mendapatkan role.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('role-button')
                .setLabel('Dapatkan Role')
                .setStyle(ButtonStyle.Primary)
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'role-button') {
        const role = interaction.guild.roles.cache.find((r) => r.name === 'Member');
        if (!role) return interaction.reply('Role tidak ditemukan.');

        const member = interaction.member;
        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            interaction.reply('Role telah dihapus!');
        } else {
            await member.roles.add(role);
            interaction.reply('Role telah ditambahkan!');
        }
    }
});

// Otomatis Pasang Icon Role
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const roleIcon = newMember.guild.roles.cache.find((r) => r.name === 'Member');
    if (!roleIcon || !newMember.roles.cache.has(roleIcon.id)) return;

    try {
        await newMember.user.setAvatar('./path-to-your-icon.png');
    } catch (error) {
        console.error('Gagal mengatur ikon role:', error);
    }
});

// Login Bot
client.login(BOT_TOKEN);
