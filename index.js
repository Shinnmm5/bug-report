const {
  Client,
  GatewayIntentBits,
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

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName('setup-reporter')
    .setDescription('Post the server reporter panel (Admin only)')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once(Events.ClientReady, async (c) => {
  console.log(` Logged in as ${c.user.tag}`);
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log(' Registered /setup-reporter command');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup-reporter') {
    const embed = new EmbedBuilder()
      .setTitle(' Developer Reporting Panel')
      .setDescription(
        'Welcome to the Server Reporter! Use the button below to submit structured reports directly to the game developers.\n\n' +
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

  if (interaction.isButton() && interaction.customId === 'create_report_btn') {
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

  if (interaction.isModalSubmit() && interaction.customId === 'report_modal') {
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
        return await interaction.editReply({
          content: ' Developer report channel was not found.',
        });
      }

      const reportEmbed = new EmbedBuilder()
        .setTitle(`[${categoryTag}] ${target}`)
        .setColor(embedColor)
        .addFields(
          { name: 'Submitted By', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
          { name: 'Target / Subject', value: target, inline: true },
          { name: 'Category Given', value: category, inline: true },
          { name: 'Description & Proof', value: details }
        )
        .setTimestamp();

      await channel.send({ embeds: [reportEmbed] });

      await interaction.editReply({
        content: ' Your report has been successfully sent to the game developers. Thank you!',
      });
    } catch (error) {
      console.error('Report submission error:', error);
      await interaction.editReply({
        content: ' An error occurred while processing your submission.',
      });
    }
  }
});

client.login(TOKEN);
