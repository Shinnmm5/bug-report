const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const REPORTS_CHANNEL_ID = process.env.REPORTS_CHANNEL_ID || '1543934020843474995';
const SUGGESTIONS_CHANNEL_ID = process.env.SUGGESTIONS_CHANNEL_ID || REPORTS_CHANNEL_ID;
const AUTOROLE_ID = process.env.AUTOROLE_ID || '1550103315600113694';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Matches http://, https://, www., and short domain links
const ALL_LINKS_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.(gg|io|me|li)\/[^\s]+)/i;

const commands = [
  new SlashCommandBuilder()
    .setName('setup-reporter')
    .setDescription('Post the bug & exploiter reporting panel (Admin only)'),
  new SlashCommandBuilder()
    .setName('setup-suggestion')
    .setDescription('Post the player suggestions panel (Admin only)'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once(Events.ClientReady, async (c) => {
  console.log(` Logged in as ${c.user.tag}`);
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log(' Registered slash commands');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

// ==================== ANTI-ALL-LINKS LISTENER ====================
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  // Admins & Moderators with Manage Messages permission bypass link restriction
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  // Check if message contains ANY URL
  if (ALL_LINKS_REGEX.test(message.content)) {
    try {
      await message.delete();

      const warning = await message.channel.send(
        ` ${message.author}, posting links is not allowed in this server!`
      );

      setTimeout(() => warning.delete().catch(() => {}), 5000);
    } catch (error) {
      console.error(`Failed to delete link from ${message.author.tag}:`, error);
    }
  }
});

// ==================== AUTO ROLE EVENT ====================
client.on(Events.GuildMemberAdd, async (member) => {
  if (!AUTOROLE_ID) return;

  try {
    const role = member.guild.roles.cache.get(AUTOROLE_ID);
    if (role) {
      await member.roles.add(role);
      console.log(` Auto-role assigned to ${member.user.tag}`);
    }
  } catch (error) {
    console.error(` Failed to auto-assign role:`, error);
  }
});

// ==================== INTERACTION HANDLERS ====================
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'setup-reporter') {
      const embed = new EmbedBuilder()
        .setTitle(' Developer Reporting Panel')
        .setDescription(
          'Welcome to the Server Reporter! Use the button below to submit structured reports directly to the developers.\n\n' +
          '**Categories:**\n' +
          '• **Exploiter:** Cheating, malicious scripts, or game exploits.\n' +
          '• **Bugs:** Broken mechanics, map glitches, or gameplay bugs.'
        )
        .setColor(0x0099FF)
        .setFooter({ text: 'AetherRise Dev Tools' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('create_report_btn')
          .setLabel('Create Report')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    if (interaction.commandName === 'setup-suggestion') {
      const embed = new EmbedBuilder()
        .setTitle(' Player Suggestions Panel')
        .setDescription(
          'Have an idea to improve the game or server? Click the button below to submit your suggestion to the developers and community!\n\n' +
          '**Guidelines:**\n' +
          '• Be specific with your idea.\n' +
          '• Explain why should we add it.\n' +
          '• Keep suggestions good.'
        )
        .setColor(0x00FF7F)
        .setFooter({ text: 'AetherRise Community Feedback' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('create_suggestion_btn')
          .setLabel('Submit Suggestion')
          .setEmoji('🙏')
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'create_report_btn') {
      const modal = new ModalBuilder()
        .setCustomId('report_modal')
        .setTitle('Submit a Developer Report');

      const categoryInput = new TextInputBuilder()
        .setCustomId('report_category')
        .setLabel('Category (Exploiter OR Bug)')
        .setPlaceholder('Type "Exploiter" or "Bug"')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const targetInput = new TextInputBuilder()
        .setCustomId('report_target')
        .setLabel('Game Username / Subject')
        .setPlaceholder('Username of exploiter or system name of bug')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const detailsInput = new TextInputBuilder()
        .setCustomId('report_details')
        .setLabel('Description & Evidence Links')
        .setPlaceholder('Provide a detailed description and video/image links...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(categoryInput),
        new ActionRowBuilder().addComponents(targetInput),
        new ActionRowBuilder().addComponents(detailsInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === 'create_suggestion_btn') {
      const modal = new ModalBuilder()
        .setCustomId('suggestion_modal')
        .setTitle('Submit a Player Suggestion');

      const titleInput = new TextInputBuilder()
        .setCustomId('suggestion_title')
        .setLabel('Suggestion Title')
        .setPlaceholder('e.g., Add New Things, Rebalance Or Adjustment')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const categoryInput = new TextInputBuilder()
        .setCustomId('suggestion_category')
        .setLabel('Category')
        .setPlaceholder('e.g., Gameplay, UI, Economy, Cosmetics')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const detailsInput = new TextInputBuilder()
        .setCustomId('suggestion_details')
        .setLabel('Detailed Explanation & Rationale')
        .setPlaceholder('Describe your idea in detail and explain why it should be added...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(categoryInput),
        new ActionRowBuilder().addComponents(detailsInput)
      );

      await interaction.showModal(modal);
      return;
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'report_modal') {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
      }

      const category = interaction.fields.getTextInputValue('report_category').trim();
      const target = interaction.fields.getTextInputValue('report_target');
      const details = interaction.fields.getTextInputValue('report_details');

      const isExploiter = category.toLowerCase().includes('exploit');
      const embedColor = isExploiter ? 0xFF0000 : 0xFFA500;
      const categoryTag = isExploiter ? ' EXPLOITER REPORT' : ' BUG REPORT';

      try {
        const channel = await interaction.client.channels.fetch(REPORTS_CHANNEL_ID).catch(() => null);

        if (!channel) {
          return await interaction.editReply({ content: ' Developer report channel not found.' });
        }

        const reportEmbed = new EmbedBuilder()
          .setTitle(`[${categoryTag}] ${target}`)
          .setColor(embedColor)
          .addFields(
            { name: 'Submitted By', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
            { name: 'Target / Subject', value: target, inline: true },
            { name: 'Category', value: category, inline: true },
            { name: 'Description & Proof', value: details }
          )
          .setTimestamp();

        await channel.send({ embeds: [reportEmbed] });

        await interaction.editReply({ content: ' Your report has been sent to the developers. Thank you!' });
      } catch (error) {
        console.error('Report submission error:', error);
        await interaction.editReply({ content: ' An error occurred while submitting your report.' });
      }
      return;
    }

    if (interaction.customId === 'suggestion_modal') {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
      }

      const title = interaction.fields.getTextInputValue('suggestion_title').trim();
      const category = interaction.fields.getTextInputValue('suggestion_category').trim();
      const details = interaction.fields.getTextInputValue('suggestion_details');

      try {
        const channel = await interaction.client.channels.fetch(SUGGESTIONS_CHANNEL_ID).catch(() => null);

        if (!channel) {
          return await interaction.editReply({ content: ' Suggestions channel not found.' });
        }

        const suggestionEmbed = new EmbedBuilder()
          .setTitle(` [${category.toUpperCase()}] ${title}`)
          .setColor(0x00FF7F)
          .addFields(
            { name: 'Suggested By', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
            { name: 'Category', value: category, inline: true },
            { name: 'Details & Rationale', value: details }
          )
          .setTimestamp()
          .setFooter({ text: 'Community Feedback — React below to vote!' });

        const msg = await channel.send({ embeds: [suggestionEmbed] });
        await msg.react('👍');
        await msg.react('👎');

        await interaction.editReply({ content: ' Your suggestion has been submitted and posted for community voting!' });
      } catch (error) {
        console.error('Suggestion submission error:', error);
        await interaction.editReply({ content: ' An error occurred while submitting your suggestion.' });
      }
    }
  }
});

client.login(TOKEN);
