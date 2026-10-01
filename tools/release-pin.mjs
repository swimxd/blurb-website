const releases={
 'swimxd/eduprofix':['eduprofix','EDUPROFIX_DEPLOY_KEY_B64'],
 'swimxd/world-game':['eduprofix_remastered','WORLD_GAME_DEPLOY_KEY_B64'],
 'swimxd/eduprofix-mod':['eduprofix_mod','EDUPROFIX_MOD_DEPLOY_KEY_B64']
};
export function validateReleasePin(game){
 const expected=releases[game.repository];
 if(!expected || !/^[a-f0-9]{40}$/.test(game.commit) || game.route!==expected[0] || game.deployKeyEnv!==expected[1])throw new Error('Invalid game release pin');
}
