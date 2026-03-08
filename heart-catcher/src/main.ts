import { GameLoop } from './engine/GameLoop';
import { Renderer } from './engine/Renderer';
import { SceneManager } from './engine/SceneManager';
import { InputManager } from './engine/InputManager';
import { AssetLoader } from './engine/AssetLoader';
import { AudioEngine } from './engine/AudioEngine';
import { TweenEngine } from './engine/TweenEngine';
import { SaveManager } from './systems/SaveManager';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import { ScrapbookScene } from './scenes/ScrapbookScene';
import { HowToPlayScene } from './scenes/HowToPlayScene';
import { SettingsScene } from './scenes/SettingsScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const renderer = new Renderer('game');
const { ctx } = renderer;

const sceneManager = new SceneManager();
const input = new InputManager(renderer.canvas);
const assets = new AssetLoader();
const audio = new AudioEngine(assets);
const tweens = new TweenEngine();
const saveManager = new SaveManager();

// ─── Factory functions (avoid circular imports) ────────────────────────────

function makeScrapbookScene(data: unknown): ScrapbookScene {
  const scene = new ScrapbookScene(
    sceneManager, input, audio, saveManager,
    (levelId: number) => makeGameScene(levelId),
    makeMainMenuScene,
    assets,
  );
  scene.init(data);
  return scene;
}

function makeGameScene(levelId: number): GameScene {
  return new GameScene(
    levelId,
    sceneManager, input, audio, assets, tweens, saveManager,
    (data: unknown) => {
      // ScrapbookScene is pushed by GameScene after init, so we just construct it
      return new ScrapbookScene(
        sceneManager, input, audio, saveManager,
        (lid: number) => makeGameScene(lid),
        makeMainMenuScene,
        assets,
      );
    },
    () => makeMainMenuScene(),
  );
}

function makeLevelSelectScene(): LevelSelectScene {
  return new LevelSelectScene(
    sceneManager, input, audio, saveManager,
    (levelId: number) => makeGameScene(levelId),
  );
}

function makeHowToPlayScene(): HowToPlayScene {
  return new HowToPlayScene(sceneManager, input);
}

function makeSettingsScene(): SettingsScene {
  return new SettingsScene(sceneManager, input, audio);
}

function makeMainMenuScene(): MainMenuScene {
  return new MainMenuScene(
    sceneManager, input, audio, saveManager,
    (levelId: number) => makeGameScene(levelId),
    makeHowToPlayScene,
    makeSettingsScene,
    (data: unknown) => makeScrapbookScene(data),
    makeLevelSelectScene,
    assets,
  );
}

// ─── Init AudioContext on first user gesture ──────────────────────────────────

const initAudio = (): void => {
  audio.init(); // internally calls resume() with the current music key
};
window.addEventListener('keydown', initAudio, { once: true });
window.addEventListener('pointerdown', initAudio, { once: true });

// ─── Boot ────────────────────────────────────────────────────────────────────

const bootScene = new BootScene(assets, sceneManager, makeMainMenuScene);
sceneManager.switch(bootScene);

// ─── Game Loop ───────────────────────────────────────────────────────────────

const loop = new GameLoop(
  (dt: number) => {
    sceneManager.update(dt);
    // Note: TweenEngine is also updated inside GameScene.update for game tweens.
    // This top-level call handles menu/UI tweens.
  },
  (_alpha: number) => {
    renderer.beginFrame();
    sceneManager.render(ctx);
  },
);

loop.start();

