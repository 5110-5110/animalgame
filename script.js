// Matter.js のモジュールエイリアス
const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

// ゲーム設定
const WIDTH = 400;
const HEIGHT = 600;

// 動物の定義（小さい順：サイズ、スコア、絵文字、背景色）
const ANIMALS = [
    { radius: 15, score: 1, emoji: '🐜', color: '#ffcccc' }, // 0: アリ
    { radius: 22, score: 3, emoji: '🐸', color: '#ffe4b5' }, // 1: カエル
    { radius: 30, score: 6, emoji: '🐰', color: '#fffacd' }, // 2: ウサギ
    { radius: 40, score: 10, emoji: '🐱', color: '#e0ffff' }, // 3: ネコ
    { radius: 52, score: 15, emoji: '🦊', color: '#e6e6fa' }, // 4: キツネ
    { radius: 65, score: 21, emoji: '🐷', color: '#ffb6c1' }, // 5: ブタ
    { radius: 80, score: 28, emoji: '🐼', color: '#dda0dd' }, // 6: パンダ
    { radius: 98, score: 36, emoji: '🦁', color: '#f0e68c' }, // 7: ライオン
    { radius: 118, score: 45, emoji: '🐘', color: '#b0e0e6' }, // 8: ゾウ
];

let engine, render, runner;
let score = 0;
let currentAnimalIndex = 0;
let canDrop = true;
let isGameOver = false;

const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');

function initGame() {
    // スコア初期化
    score = 0;
    scoreElement.innerText = score;
    isGameOver = false;
    gameOverElement.classList.add('hidden');

    // 物理エンジンの作成
    engine = Engine.create();
    const world = engine.world;
    world.gravity.y = 1;

    // レンダラーの作成（Canvasへの描画）
    const canvas = document.getElementById('gameCanvas');
    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: WIDTH,
            height: HEIGHT,
            wireframes: false,
            background: '#ffffff'
        }
    });

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    // 壁の作成（床、左右の壁）
    const wallOptions = { isStatic: true, render: { visible: false } };
    const ground = Bodies.rectangle(WIDTH / 2, HEIGHT + 20, WIDTH, 40, wallOptions);
    const leftWall = Bodies.rectangle(-20, HEIGHT / 2, 40, HEIGHT, wallOptions);
    const rightWall = Bodies.rectangle(WIDTH + 20, HEIGHT / 2, 40, HEIGHT, wallOptions);
    Composite.add(world, [ground, leftWall, rightWall]);

    // 衝突判定の設定
    Events.on(engine, 'collisionStart', handleCollisions);

    // キャンバス上のクリック操作（動物を落とす）
    canvas.addEventListener('click', dropAnimal);
    
    // 次に落とす動物のランダム選択
    setNextAnimal();
}

function setNextAnimal() {
    // 最初の方は小さめの動物（インデックス0〜3）からランダム選出
    currentAnimalIndex = Math.floor(Math.random() * 4);
}

function dropAnimal(event) {
    if (!canDrop || isGameOver) return;

    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(50, Math.min(WIDTH - 50, event.clientX - rect.left));
    const y = 50;

    canDrop = false;
    createAnimal(x, y, currentAnimalIndex);

    // 少しウェイトを入れて連続タップを防ぐ
    setTimeout(() => {
        setNextAnimal();
        canDrop = true;
    }, 500);
}

function createAnimal(x, y, index, isStatic = false) {
    const animalData = ANIMALS[index];
    const body = Bodies.circle(x, y, animalData.radius, {
        isStatic: isStatic,
        restitution: 0.2, // 跳ね返り具合
        friction: 0.05,
        render: {
            fillStyle: animalData.color,
            strokeStyle: '#333',
            lineWidth: 2
        }
    });

    body.animalIndex = index;
    Composite.add(engine.world, body);
    return body;
}

// 描画ループカスタム（絵文字を円の上に描画する）
Events.on(render, 'afterRender', () => {
    const context = render.context;
    const bodies = Composite.allBodies(engine.world);

    bodies.forEach(body => {
        if (body.animalIndex !== undefined) {
            const animalData = ANIMALS[body.animalIndex];
            context.font = `${animalData.radius * 1.2}px Arial`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(animalData.emoji, body.position.x, body.position.y);

            // ゲームオーバー判定用ライン（上部ラインを超えて一定時間留まった場合など簡易判定）
            if (!body.isStatic && body.position.y < 80 && body.velocity.y > -0.5 && body.velocity.y < 0.5) {
                // 上部に動物が積み上がったらゲームオーバー
                // triggerGameOver();
            }
        }
    });
});

// 当たったときの進化処理
const processedPairs = new Set();

function handleCollisions(event) {
    const pairs = event.pairs;

    pairs.forEach(pair => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if (bodyA.animalIndex !== undefined && bodyB.animalIndex !== undefined) {
            if (bodyA.animalIndex === bodyB.animalIndex) {
                const index = bodyA.animalIndex;
                
                // 最大の動物同士でなければ進化
                if (index < ANIMALS.length - 1) {
                    // 二重処理防止
                    if (processedPairs.has(bodyA) || processedPairs.has(bodyB)) return;
                    processedPairs.add(bodyA);
                    processedPairs.add(bodyB);

                    // 中点計算
                    const midX = (bodyA.position.x + bodyB.position.x) / 2;
                    const midY = (bodyA.position.y + bodyB.position.y) / 2;

                    // スコア加算
                    score += ANIMALS[index].score;
                    scoreElement.innerText = score;

                    // 古いオブジェクトを削除
                    Composite.remove(engine.world, bodyA);
                    Composite.remove(engine.world, bodyB);

                    // 新しい大きい動物を生成
                    createAnimal(midX, midY, index + 1);

                    setTimeout(() => {
                        processedPairs.delete(bodyA);
                        processedPairs.delete(bodyB);
                    }, 100);
                }
            }
        }
    });
}

function triggerGameOver() {
    if (isGameOver) return;
    isGameOver = true;
    gameOverElement.classList.remove('hidden');
    // エンジンを停止
    Runner.stop(runner);
}

restartBtn.addEventListener('click', () => {
    // 一度エンジンやレンダラーを破棄して再初期化
    Render.stop(render);
    Runner.stop(runner);
    document.getElementById('gameCanvas').innerHTML = '';
    initGame();
});

// ゲーム開始
initGame();
