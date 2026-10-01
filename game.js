const $=id=>document.getElementById(id);
const screens={home:$("home"),game:$("game"),over:$("over")};
const rules=[
 {text:"TAP BLUE",type:"color",value:"blue"},
 {text:"TAP RED",type:"color",value:"red"},
 {text:"TAP GREEN",type:"color",value:"green"},
 {text:"TAP YELLOW",type:"color",value:"yellow"},
 {text:"TAP PURPLE",type:"color",value:"purple"},
 {text:"TAP THE CIRCLE",type:"shape",value:"circle"},
 {text:"TAP THE SQUARE",type:"shape",value:"square"},
 {text:"TAP THE TRIANGLE",type:"shape",value:"triangle"},
 {text:"TAP THE SMALLEST",type:"size",value:"small"},
 {text:"IGNORE THE RED",type:"avoid",value:"red"}
];
let score=0,best=Number(localStorage.rbBest||0),lives=3,round=0,timer=null,difficulty=1700;
const colors=["blue","red","green","yellow","purple"],shapes=["circle","square","triangle"];
function show(name){Object.values(screens).forEach(s=>s.classList.remove("active"));screens[name].classList.add("active")}
function start(){score=0;lives=3;round=0;difficulty=1700;updateHUD();show("game");nextRound()}
function updateHUD(){$("score").textContent=score;$("ruleNo").textContent=`${(round%rules.length)+1}/${rules.length}`;$("lives").textContent="♥ ".repeat(lives).trim()}
function loseLife(){lives--;updateHUD();$("arena").classList.remove("shake");void $("arena").offsetWidth;$("arena").classList.add("shake");if(lives<=0)endGame();else nextRound()}
function makeShapes(rule){const arena=$("arena");arena.innerHTML="";const count=5+Math.min(3,Math.floor(round/2));for(let i=0;i<count;i++){const el=document.createElement("div");el.className="shape";let color=colors[Math.floor(Math.random()*colors.length)],shape=shapes[Math.floor(Math.random()*shapes.length)],size=48+Math.random()*34;if(rule.type==="color"&&i===0)color=rule.value;if(rule.type==="shape"&&i===0)shape=rule.value;if(rule.type==="size"&&i===0)size=42;if(rule.type==="avoid"&&i===0)color="red";el.classList.add(color,shape);if(shape==="triangle")el.style.borderBottomColor=getComputedStyle(el).backgroundColor;else{el.style.width=size+"px";el.style.height=size+"px"}el.dataset.color=color;el.dataset.shape=shape;el.dataset.size=size;const maxX=Math.max(4,arena.clientWidth-size-4),maxY=Math.max(4,arena.clientHeight-size-4);el.style.left=Math.random()*maxX+"px";el.style.top=Math.random()*maxY+"px";el.addEventListener("pointerdown",()=>tap(el,rule),{passive:true});arena.appendChild(el)}}
function correct(el,rule){if(rule.type==="avoid")return el.dataset.color!=="red";if(rule.type==="color")return el.dataset.color===rule.value;if(rule.type==="shape")return el.dataset.shape===rule.value;if(rule.type==="size"){const all=[...document.querySelectorAll(".shape")];const min=Math.min(...all.map(x=>Number(x.dataset.size)));return Number(el.dataset.size)===min}}
function tap(el,rule){if(correct(el,rule)){score++;round++;difficulty=Math.max(650,difficulty-35);updateHUD();el.style.transform="scale(1.25)";setTimeout(nextRound,80)}else loseLife()}
function nextRound(){clearTimeout(timer);const rule=rules[round%rules.length];$("ruleText").textContent=rule.text;$("ruleNo").textContent=`${(round%rules.length)+1}/${rules.length}`;makeShapes(rule);const duration=difficulty;$("timerBar").style.transition="none";$("timerBar").style.width="100%";requestAnimationFrame(()=>{$("timerBar").style.transition=`width ${duration}ms linear`;$("timerBar").style.width="0%"});timer=setTimeout(loseLife,duration+30)}
function endGame(){clearTimeout(timer);best=Math.max(best,score);localStorage.rbBest=best;$("finalScore").textContent=score;$("bestScore").textContent=best;show("over")}
$("playBtn").onclick=start;$("againBtn").onclick=start;$("homeBtn").onclick=()=>show("home");show("home");