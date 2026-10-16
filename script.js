const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;

const WIDTH = 400;
const HEIGHT = 600;

const ANIMALS = [
    { radius: 15, score: 1, emoji: '🐜', color: '#ffcccc' },
    { radius: 22, score: 3, emoji: '🐸', color: '#ffe4b5' },
    { radius: 30, score: 6, emoji: '🐰', color: '#fffacd' },
    { radius: 40, score: 10, emoji: '🐱', color: '#e0ffff' },
    { radius: 52, score: 15, emoji: '🦊', color: '#e6e6fa' },
    { radius: 65, score: 21, emoji: '🐷', color: '#ffb6c1' },
    { radius: 80, score: 28, emoji: '🐼', color: '#dda0dd' },
    { radius: 98, score: 36, emoji: '🦁', color: '#f0e68c' },
    { radius: 118, score: 45, emoji: '🐘', color: '#b0e0e6' },
];

let engine, render, runner;
let score = 0;
let currentAnimalIndex = 0;
let nextAnimalIndex = 0;
let canDrop = true;
let isGameOver = false;
let currentX = WIDTH / 2;
let processedPairs = new Set();

const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const canvas = document.getElementById('gameCanvas');

function initGame() {
    score = 0;
    scoreElement.innerText = score;
    isGameOver = false;
    gameOverElement.classList.add('hidden');
    processedPairs.clear();

    if (engine) {
        Composite.clear(engine.world, false);
        Engine.clear(engine);
    }

    engine = Engine.create();
    engine.world.gravity.y = 1;

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

    const wallOptions = { isStatic: true, render: { visible: false } };
    const ground = Bodies.rectangle(WIDTH / 2, HEIGHT + 20, WIDTH, 40, wallOptions);
    const leftWall = Bodies.rectangle(-20, HEIGHT / 2, 40, HEIGHT, wallOptions);
    const rightWall = Bodies.rectangle(WIDTH + 20, HEIGHT / 2, 40, HEIGHT, wallOptions);
    Composite.add(engine.world, [ground, leftWall, rightWall]);

    Events.on(engine, 'collisionStart', handleCollisions);

    selectRandomAnimals();
    canDrop = true;
}

function selectRandomAnimals() {
    currentAnimalIndex = nextAnimalIndex;
    nextAnimalIndex = Math.floor(Math.random() * 4);
    // 初回起動時は両方ランダムに設定
    if (score === 0 && currentAnimalIndex === 0 && nextAnimalIndex === 0) {
        currentAnimalIndex = Math.floor(Math.random() * 4);
        nextAnimalIndex = Math.floor(Math.random() * 4);
    }
}

function getCanvasX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const x = (clientX - rect.left) * scaleX;
    const radius = ANIMALS[currentAnimalIndex].radius;
    return Math.max(radius, Math.min(WIDTH - radius, x));
}

// マウスやタッチの移動に合わせて上の位置を更新
canvas.addEventListener('mousemove', (e) => {
    currentX = getCanvasX(e.clientX);
});

canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        currentX = getCanvasX(e.touches[0].clientX);
    }
}, { passive: true });

function dropAnimal() {
    if (!canDrop || isGameOver) return;

    canDrop = false;
    const radius = ANIMALS[currentAnimalIndex].radius;
    const body = Bodies.circle(currentX, 60, radius, {
        restitution: 0.2,
        friction: 0.05,
        render: {
            fillStyle: ANIMALS[currentAnimalIndex].color,
            strokeStyle: '#333',
            lineWidth: 2
        }
    });

    body.animalIndex = currentAnimalIndex;
    Composite.add(engine.world, body);

    // 少しウェイトを入れてから次の動物をスタンバイ
    setTimeout(() => {
        selectRandomAnimals();
        canDrop = true;
    }, 400);
}

canvas.addEventListener('click', (e) => {
    currentX = getCanvasX(e.clientX);
    dropAnimal();
});

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        currentX = getCanvasX(e.touches[0].clientX);
        dropAnimal();
    }
}, { passive: true });

// 描画ループ（上部のスタンバイ動物 ＋ フィールド上の動物たち）
Events.on(render, 'afterRender', () => {
    const context = render.context;

    // 1. 上部に次に落とす動物を描画（落下可能な状態のときのみ）
    if (canDrop && !isGameOver) {
        const animalData = ANIMALS[currentAnimalIndex];
        
        // 破線のガイドラインを描画
        context.save();
        context.strokeStyle = '#b2bec3';
        context.lineWidth = 2;
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(currentX, 80);
        context.lineTo(currentX, HEIGHT);
        context.stroke();
        context.restore();

        // 動物本体を描画
        context.save();
        context.fillStyle = animalData.color;
        context.strokeStyle = '#333';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(currentX, 50, animalData.radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();

        context.font = `${animalData.radius * 1.2}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(animalData.emoji, currentX, 50);
        context.restore();
    }

    // 2. 物理エンジン内の動物たちを描画
    const bodies = Composite.allBodies(engine.world);
    bodies.forEach(body => {
        if (body.animalIndex !== undefined) {
            const animalData = ANIMALS[body.animalIndex];
            context.font = `${animalData.radius * 1.2}px Arial`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(animalData.emoji, body.position.x, body.position.y);
        }
    });
});

function handleCollisions(event) {
    const pairs = event.pairs;

    pairs.forEach(pair => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if (bodyA.animalIndex !== undefined && bodyB.animalIndex !== undefined) {
            if (bodyA.animalIndex === bodyB.animalIndex) {
                const index = bodyA.animalIndex;
                
                if (index < ANIMALS.length - 1) {
                    if (processedPairs.has(bodyA) || processedPairs.has(bodyB)) return;
                    processedPairs.add(bodyA);
                    processedPairs.add(bodyB);

                    const midX = (bodyA.position.x + bodyB.position.x) / 2;
                    const midY = (bodyA.position.y + bodyB.position.y) / 2;

                    score += ANIMALS[index].score;
                    scoreElement.innerText = score;

                    Composite.remove(engine.world, bodyA);
                    Composite.remove(engine.world, bodyB);

                    // 新しい大きい動物を作成
                    const newAnimalData = ANIMALS[index + 1];
                    const newBody = Bodies.circle(midX, midY, newAnimalData.radius, {
                        restitution: 0.2,
                        friction: 0.05,
                        render: {
                            fillStyle: newAnimalData.color,
                            strokeStyle: '#333',
                            lineWidth: 2
                        }
                    });
                    newBody.animalIndex = index + 1;
                    Composite.add(engine.world, newBody);

                    setTimeout(() => {
                        processedPairs.delete(bodyA);
                        processedPairs.delete(bodyB);
                    }, 100);
                }
            }
        }
    });
}

restartBtn.addEventListener('click', () => {
    Render.stop(render);
    Runner.stop(runner);
    initGame();
});

initGame();
