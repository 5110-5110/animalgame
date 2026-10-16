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
let canDrop = true;
let isGameOver = false;
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

    // 既存のエンジンがあればクリア
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

    setNextAnimal();
}

function setNextAnimal() {
    currentAnimalIndex = Math.floor(Math.random() * 4);
}

function handleDrop(clientX) {
    if (!canDrop || isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    // 画面上の表示サイズとCanvasの内部解像度の比率を計算
    const scaleX = WIDTH / rect.width;
    const x = Math.max(50, Math.min(WIDTH - 50, (clientX - rect.left) * scaleX));
    const y = 50;

    canDrop = false;
    createAnimal(x, y, currentAnimalIndex);

    setTimeout(() => {
        setNextAnimal();
        canDrop = true;
    }, 500);
}

// スマホのタップとPCのクリック両方に対応
canvas.addEventListener('click', (e) => {
    handleDrop(e.clientX);
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
        handleDrop(e.touches[0].clientX);
    }
}, { passive: false });

function createAnimal(x, y, index) {
    const animalData = ANIMALS[index];
    const body = Bodies.circle(x, y, animalData.radius, {
        restitution: 0.2,
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

restartBtn.addEventListener('click', () => {
    Render.stop(render);
    Runner.stop(runner);
    initGame();
});

// ゲーム開始
initGame();
