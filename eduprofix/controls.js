const actions={ArrowUp:'forward',KeyW:'forward',ArrowDown:'backward',KeyS:'backward',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
export function controlCode(event){return actions[event.code]?event.code:actions[event.key]?event.key:({w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD'})[event.key?.toLowerCase()]??event.code??event.key;}
export function isDrivingKey(code){return !!actions[code];}
export function drivingInput(keys,extra={}){
 const pressed=action=>[...keys].some(key=>actions[key]===action);
 return {...extra,forward:pressed('forward'),backward:pressed('backward'),steering:Number(pressed('right'))-Number(pressed('left'))};
}
