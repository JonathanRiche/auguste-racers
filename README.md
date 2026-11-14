# August Racers

A very simple 3D driving game for toddlers on Android, made for August.
Drive around a track with a gamepad (Backbone, Xbox, PlayStation or any controller Android recognises) or by touch.

## Install

Download the APK from the [latest release](https://github.com/JonathanRiche/august-racers/releases/latest) on the phone and open it.
Android will ask you to allow installing from your browser or file manager the first time.

## Playing

- Pick a vehicle (race car, monster truck, fire truck, school bus, tractor), a driver (racer, puppy, kitty, bear, dino, bunny) and a track (Sunny Meadow, Sandy Beach, Snowy Hills).
- By default the car drives by itself and steering help keeps it on the road, so a toddler only has to steer, or do nothing at all. The edges of the track are soft, nothing crashes, and the friends always let the player finish first.

| Control | Gamepad | Touch |
|---|---|---|
| Steer | Left stick or d-pad | Hold the left or right side of the screen |
| Horn and hop | X, Y, bumpers (and A while the car drives itself) | Horn button |
| Go (when "Hold A to go" is on) | A or right trigger | Touch the screen |
| Brake | B or left trigger | |
| Pause | Start | Pause button |
| Menus | Stick or d-pad, A to choose, B to go back | Tap |

Options (the Options button or Y on the track screen): laps, race with friends or just drive, speed, steering help, auto-drive and sound.

## Building

Needs bun, JDK 17, Gradle 8.11+ and the Android SDK (platform 36, build-tools 35.0.0).

```sh
export ANDROID_HOME=/path/to/android-sdk JAVA_HOME=/path/to/jdk-17 GRADLE_BIN=/path/to/gradle
./build.sh        # writes dist/august-racers-<version>.apk
```

The same exports can live in an untracked `local-env.sh`. Release signing is read from `~/.config/august-racers/signing.properties` (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`); without it the APK is debug-signed.

## Layout

- `game/` is the game itself: three.js, bundled by bun into one script. `game/src/main.js` holds the game loop and menus, `models.js` the vehicles and drivers, `world.js` the tracks, `input.js` the controls and `audio.js` the synthesised sounds.
- `android/` is a small Java shell that shows the game full screen and passes gamepad input to it.

To try the game in a desktop browser, run `bun run build` in `game/` and open `android/app/src/main/assets/index.html` (arrow keys, Enter, Esc, H for the horn).
