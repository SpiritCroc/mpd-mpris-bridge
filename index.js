const retry = require('async-retry');
const mpd = require('mpd-server');
const dbus = require('dbus-native');

const sessionBus = dbus.sessionBus();

function createCurrentSongResponse(artist, title, duration, artUrl) {
    return `file: ${title}
Title: ${title}
Artist: ${artist}
Time: ${duration}
duration: ${duration}
arturl: ${artUrl}
`;
}

function createStatusResponse(position, duration, state, artUrl) {
    let time = isNaN(duration) ? `${Math.round(position)}` : `${Math.round(position)}:${Math.round(duration)}`;
    return `repeat: 0
random: 0
playlistlength: 1
state: ${state}
time: ${time}
elapsed: ${position}
arturl: ${artUrl}
`;
}

function createMetadataObject(metadata) {
    return metadata.map(attribute => {
        let value;

        switch (attribute[1][0][0].type) {
            case "a":
                // If it's an array, let's just assume we want the first value for now
                value = attribute[1][1][0][0];
                break;
            case "s":
            case "o":
            case "x":
                value = attribute[1][1][0];
                break;
            case "u":
                value = attribute[1][1][0] / 1000000;
                break;
            default:
                console.warn('Unknown type found: ' + attribute[1][0][0].type);
                break;
        }

        return {
            name: attribute[0],
            value: value
        };
    }).reduce((result, attribute) => {
        result[attribute.name] = attribute.value;
        return result;
    }, {});
}

function startListening(service) {
    sessionBus.getService(service).getInterface('/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', function (error, player) {
        const mpdServer = mpd(function(command, parameters, connection) {        
            //console.info('Got command: ' + command);
            switch (command) {
                case 'next':
                    return new Promise(function (resolve) {
                        player.Next(() => {
                            resolve('');
                        });
                    });
                case 'play':
                    return new Promise(function (resolve) {
                        player.Play(() => {
                            resolve('');
                        });
                    });
                case 'pause':
                    return new Promise(function (resolve) {
                        player.Pause(() => {
                            resolve('');
                        });
                    });
                case 'previous':
                        return new Promise(function (resolve) {
                            player.Previous(() => {
                                resolve('');
                            });
                        });
                case 'random':
                    return new Promise(function (resolve) {
                        player.Shuffle = true;

                        resolve('');
                    });
                case 'stop':
                    // TODO: use stop unless it doesn't work? My player can only pause right now
                    return new Promise(function (resolve) {
                        player.Pause(() => {
                            resolve('');
                        });
                    });
                case 'status':
                    return new Promise(function (resolve, reject) {
                        player.PlaybackStatus((e, playbackStatus) => {
                            player.Metadata((e, metadata) => {
                                player.Position((e, position) => {
                                    if (e) {
                                        reject('Could not get property value', e);
                                        return;
                                    }
                                    
                                    const result = createMetadataObject(metadata);
    
                                    let state;

                                    switch (playbackStatus) {
                                        case 'Playing':
                                            state = 'play';
                                            break;
                                        case 'Paused':
                                            state = 'pause';
                                            break;
                                        case 'Stopped':
                                            state = 'stop';
                                            break;
                                        default:
                                            console.warn('Unknown playback status: ' + playbackStatus);
                                            break;
                                    }

                                    resolve(createStatusResponse(
                                        position / 1000000,
                                        parseFloat(result['mpris:length']) / 1000000.0,
                                        state,
                                        result['mpris:artUrl'],
                                    ));
                                });
                            });
                        });
                    });
                case 'currentsong':
                    return new Promise(function (resolve, reject) {
                        player.Metadata((e, metadata) => {
                            if (e) {
                                reject('Could not get property value', e);
                                return;
                            }

                            const result = createMetadataObject(metadata);
                
                            resolve(createCurrentSongResponse(
                                result['xesam:artist'],
                                result['xesam:title'],
                                result['mpris:length'] / 1000000.0,
                                result['mpris:artUrl']
                            ));
                        });
                    });
                case 'playlistinfo':
                    return Promise.resolve("");
                case 'close':
                    return Promise.resolve("");
                case 'ping':
                    return Promise.resolve("OK");
                default:
                    console.log('Command', command, parameters);

                    return Promise.resolve('');
            }
        });
        
        mpdServer.listen({ port: 6601 }, () => {
            console.log('MPD server running on ', mpdServer.server.address());
        });
        
        mpdServer.on('error', (error, s) => {
            console.error(error);
        });
        
        setInterval(() => {
            mpdServer.systemUpdate('player');
            mpdServer.systemUpdate('playlist');
            mpdServer.systemUpdate('message');
        }, 1000);
        
        player.on('Seeked', function () {
            console.log(player);
        });
    });
}

async function startServer() {
    // We never actually resolve this promise, only reject it on error
    return new Promise((resolve, reject) => {
        sessionBus.listNames(function (error, names) {
            // TODO: This only gets the first player that matches
            let first = names.find(name => name.startsWith('org.mpris.MediaPlayer2.'));
            if (first) {
                startListening(first);
            } else {
                reject(new Error('No org.mpris.MediaPlayer2 service could be found. Perhaps you don\'t have a media player open yet... This isn\'t an ideal error though'));
            }
        });
    });
}

(async () => {
    try {
        await retry(async () => {
            await startServer();
        }, {
            onRetry: error => console.error(error),
            retries: 5
        });
    } catch (e) {
        // We need to close the connection on any final failures, otherwise Node won't exit
        sessionBus.connection.end();
    }
})();
