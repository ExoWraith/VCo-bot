var Discord = require("discord.js");
var logger = require("winston");
var ytdl = require("ytdl-core-discord");
var { Player } = require("discord-music-player");

const { prefix } = require("./config.json");
const { token } = require("./auth.json");
var fs = require("fs");

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console(), {
  colorize: true,
});
logger.level = "debug";
// Initialize Discord Botgit pull

var client = new Discord.Client({
  token: token,
  autorun: true,
});

const player = new Player(client, {
  leaveOnEmpty: false, // This options are optional.
});
client.player = player;

var audioDispatcher;
client.login(token);

client.on("ready", function (evt) {
  logger.info("Discord JS Connected");
  logger.info("Logged in as: ");
  logger.info(client.user.username + " - (" + client.user.id + ")");
});

client.on("guildMemberAdd", (member) => {
  // Send the message to a designated channel on a server:
  const channel = member.guild.channels.cache.find(
    (ch) => ch.name === "member-log"
  );
  // Do nothing if the channel wasn't found on this server
  if (!channel) return;
  // Send the message, mentioning the member
  channel.send(`Welcome to the -V- Company discord, ${member}`);
  channel.send(`This a WIP -V- Co. Bot.`);
});

client.on("message", async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  console.log(message.author.username + " sends " + command + " - " + args);

  if (command == "help") {
    message.channel.send(
      "Music commands\n================\n!play <url> - Play music in voice channel from URL\n!pause - Pause current track\n!stop - Stop music and clears song queue\n" +
        "!resume - Resume current track\n!skip - Skip current song\n!song - Shows current song\n!shuffle - Shuffles the current song queue\n!queue - Shows the current song queue."
    );
    message.react("✅");
  }

  if (command == "ping") {
    message.channel.send("Pong!").then((sent) => {
      sent.edit(
        `Roundtrip latency: ${
          sent.createdTimestamp - message.createdTimestamp
        }ms`
      );
    });
    message.react("✅");
  }
  if (command == "channels") {
    var guilds = client.guilds.cache.map((guild) => {
      // console.log(guild);
    });
    // console.log(guilds);
    var channels = client.channels.cache.map((channel) => {
      console.log(channel.id + " - " + channel.type + " - " + channel.name);
    });
    // console.log(channels);
  }

  if (command == "play") {
    if (args.length == 1) {
      var url = args[0];
    } else {
      message.channel.send("No Song/URL specified.");
      message.react("❌");
      return;
    }
    let isPlaying = client.player.isPlaying(message.guild.id);
    // If there's already a song playing
    if (isPlaying) {
      // Add the song to the queue
      let song = await client.player.addToQueue(
        message.guild.id,
        args.join(" ")
      );
      song = song.song;

      message.channel.send(`Song **${song.name}** was added to the queue!`);
      message.react("✅");
    } else {
      if (message.member.voice.channel == undefined) {
        message.channel.send("Please join a voice channel.");
        return;
      }
      // Else, play the songi
      let song = await client.player.play(
        message.member.voice.channel,
        args.join(" ")
      );
      song = song.song;

      // Send a message, when Queue would be empty.
      song.queue.on("end", () => {
        message.channel.send("The queue is empty, please add new songs!");
        client.user.setActivity("");
      });

      // Send a message, when a Song would change.
      song.queue.on(
        "songChanged",
        (oldSong, newSong, skipped, repeatMode, repeatQueue) => {
          if (repeatMode) {
            message.channel.send(`Playing **${newSong.name}** again...`);
          } else if (repeatQueue) {
            message.channel.send(
              `Playing **${newSong.name}...**\nAdded **${oldSong.name}** to the end of the queue (repeatQueue).`
            );
          } else {
            message.channel.send(`Now playing **${newSong.name}**...`);
          }
          client.user.setActivity(`${newSong.name}`, {
            type: "LISTENING",
          });
        }
      );
      song.queue.on("channelEmpty", () => {
        client.user.setActivity("");
      });

      message.channel.send(`Started playing **${song.name}**!`);
      client.user.setActivity(`${song.name}`, {
        type: "LISTENING",
      });

      message.react("✅");
    }
  }

  if (command == "stop") {
    let isPlaying = client.player.isPlaying(message.guild.id);
    if (isPlaying) {
      client.player.stop(message.guild.id);
      client.user.setActivity("");
      message.channel.send("Music stopped, the queue has been cleared!");
    } else {
      message.channel.send("There is no music playing.");
    }
    message.react("✅");
  }

  if (command == "pause") {
    let isPlaying = client.player.isPlaying(message.guild.id);
    if (isPlaying) {
      client.player.pause(message.guild.id);
      message.channel.send("Music paused!");
    } else {
      message.channel.send("There is no music playing.");
    }
    message.react("✅");
  }

  if (command == "resume") {
    let isPlaying = client.player.isPlaying(message.guild.id);
    if (isPlaying) {
      client.player.resume(message.guild.id);
      message.channel.send("Music resumed!");
    } else {
      message.channel.send("There is no music playing.");
    }
    message.react("✅");
  }

  if (command == "song") {
    let isPlaying = client.player.isPlaying(message.guild.id);
    if (isPlaying) {
      let song = client.player.nowPlaying(message.guild.id);
      message.channel.send(`Current song: **${song.name}**`);
    } else {
      message.channel.send("There is no music playing.");
    }
    message.react("✅");
  }

  if (command === "shuffle") {
    let isPlaying = client.player.isPlaying(message.guild.id);
    if (isPlaying) {
      client.player.shuffle(message.guild.id);
      message.channel.send("Server Queue was shuffled.");
    } else {
      message.channel.send("There is no music playing.");
    }
    message.react("✅");
  }

  if (command === "skip") {
    let isPlaying = client.player.isPlaying(message.guild.id);
    if (isPlaying) {
      let song = await client.player.skip(message.guild.id);
      message.channel.send(`**${song.name}** was skipped!`);
    } else {
      message.channel.send("There is no music playing.");
    }
    message.react("✅");
  }

  if (command === "queue") {
    let isPlaying = client.player.isPlaying(message.guild.id);
    if (isPlaying) {
      let queue = await client.player.getQueue(message.guild.id);
      message.channel.send(
        "Current song queue:\n" +
          queue.songs
            .map((song, i) => {
              return `${i === 0 ? "Now Playing" : `#${i + 1}`} - ${
                song.name
              } | ${song.author}`;
            })
            .join("\n")
      );
    } else {
      message.channel.send("There is no music playing.");
    }
    message.react("✅");
  }
});
