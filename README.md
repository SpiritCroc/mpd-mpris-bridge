# DEPRECATION NOTICE

Fixing bugs in js got too annoying for me, so I [re-implemented this project in Rust](https://github.com/SpiritCroc/mpd-mpris-bridge-rs).

# MPD/MPRIS Bridge

This is a little service that exposes an MPD server that bridges over to an MPRIS interface through D-Bus. I wrote this so that I
could use [Polybar's](https://polybar.github.io/) MPD module without having to change my media player(s).

## Running

> I'm planning to make this a little easier to run soon...

#### Requirements

* Node.js (yes, I know)

1. Clone the repository:

    ```bash
    git clone git@github.com:jonjomckay/mpd-mpris-bridge.git
    ```

2. Install the dependencies

    ```bash
    npm install --production
    
    # OR
    
    yarn install --production
    ```

3. Run the service

    ```bash
    npm start
    
    # OR 
    
    yarn start
    ```

## Useful resources

- [MPD protocol spec](https://mpd.readthedocs.io/en/latest/protocol.html)

## License

This is licensed under the [MIT license](https://opensource.org/licenses/MIT) and contributions are welcomed :)
