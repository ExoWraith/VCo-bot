var Discord = require("discord.js");
var logger = require("winston");
var ytdl = require("ytdl-core-discord");
var { Player } = require("discord-music-player");

const { prefix, token } = require("./config.json");
var fs = require("fs");
const { stringify } = require("querystring");

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console(), {
  colorize: true,
});
logger.level = "debug";
// Initialize Discord Bot

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
  logger.info(message);
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  console.log(args);
  console.log(command);

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
    client.player.stop(message.guild.id);
    client.user.setActivity("");
    message.channel.send("Music stopped, the queue has been cleared!");
    message.react("✅");
    
  }

  if (command == "pause") {
    client.player.pause(message.guild.id);
    message.channel.send("Music paused!");
    message.react("✅");
  }

  if (command == "resume") {
    client.player.resume(message.guild.id);
    message.channel.send("Music resumed!");
    message.react("✅");
  }

  if (command == "song") {
    let song = client.player.nowPlaying(message.guild.id);
    message.channel.send(`Current song: **${song.name}**`);
    message.react("✅");
  }

  if (command === "shuffle") {
    client.player.shuffle(message.guild.id);
    message.channel.send("Server Queue was shuffled.");
    message.react("✅");
  }

  if (command === "skip") {
    let song = await client.player.skip(message.guild.id);
    message.channel.send(`**${song.name}** was skipped!`);
    message.react("✅");
  }

  if (command === "queue") {
    let queue = await client.player.getQueue(message.guild.id);
    message.channel.send(
      "Current song queue:\n" +
        queue.songs
          .map((song, i) => {
            return `${i === 0 ? "Now Playing" : `#${i + 1}`} - ${song.name} | ${
              song.author
            }`;
          })
          .join("\n")
    );
    message.react("✅");
  }

  if (command == "playlist") {
    if (args[0] == "new") {
      fs.readFile("playlists.json", "utf8", function readFile(err, data) {
        if (err) {
          console.error(err);
        } else {
          message.channel.send("Creating new playlist - " + args[1]);
          playlists = JSON.parse(data);
          playlists.push({ name: args[1], songs: [] });
          json = JSON.stringify(playlists);
          fs.writeFile("playlists.json", json, (err) => console.log(err));
        }
      });
    }
    if (args[0] == "play") {
      fs.readFile("playlists.json", "utf8", function readFile(err, data) {
        if (err) {
          console.error(err);
        } else {
          playlists = JSON.parse(data);
          console.log(playlists);
          playlists.forEach((element) => {
            if (element.name == args[1]) {
              element.songs.forEach((song) => {
                const channel = message.member.voice.channel;
                channel
                  .join()
                  .then((connection) => {
                    this.audioDispatcher = connection.dispatcher;
                    play(connection, song);
                    message.channel.send(
                      "Playing playlist " + args[1] + " in " + channel.name
                    );
                  })
                  .catch((error) => console.error(error));
              });
            }
          });
        }
      });
    }
    if (args[0] == "show") {
      fs.readFile("playlists.json", "utf8", function readFile(err, data) {
        if (err) {
          console.error(err);
        } else {
          playlists = JSON.parse(data);
          message.channel.send("Songs in playlist - " + args[1]);
          playlists.forEach((element) => {
            if (element.name == args[1]) {
              element.songs.forEach((song) => {
                var i = 0;
                message.channel.send(i + " - " + song);
                i++;
              });
            }
          });
          json = JSON.stringify(playlists);
          fs.writeFile("playlists.json", json, (err) => console.log(err));
        }
      });
    }
    if (args[0] == "add") {
      fs.readFile("playlists.json", "utf8", function readFile(err, data) {
        if (err) {
          console.error(err);
        } else {
          playlists = JSON.parse(data);
          playlists.forEach((element) => {
            if (element.name == args[1]) {
              element.songs.push(args[2]);
              message.channel.send(
                "Added - " + args[2] + " to playlist " + args[1]
              );
            }
          });
          json = JSON.stringify(playlists);
          fs.writeFile("playlists.json", json, (err) => console.log(err));
        }
      });
    }
  }
});

async function play(connection, url) {
  return connection.play(await ytdl(url), { type: "opus", volume: false });
}
