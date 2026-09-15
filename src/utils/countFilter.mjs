import math from 'mathjs';

function filterContent(message, guildData, userData) {

    const messageContent = message.content.toLowerCase();
    let output = 'seven';

    const alphabet = `a` || `b` || `c` || `d` || `e` || `f` || `g` || `h` || `i` || `j` || `k` || `l` || `m` || `n` || `o` || `p` || `q` || `r` || `s` || `t` || `u` || `v` || `w` || `x` || `y` || `z`;

    if (messageContent.includes(alphabet)) output = 'one'
    else {

        const mathCal = math.evaluate(`${messageContent}`);
        const number = parseInt(mathCal);

        if (isNaN(number)) output = 'one';
        else if (message.author.id == guildData.lastUser && userData.saves !== 0) output = 'two';
        else if (message.author.id == guildData.lastUser && guildData.saves !== 0) output = 'three';
        else if (message.author.id == guildData.lastUser) output = 'four';
        else if (guildData.score == 0 && number !== guildData.score + 1) output = 'five';
        else if (number !== guildData.score + 1 && userData.saves !== 0) output = 'two';
        else if (number !== guildData.score + 1 && guildData.saves !== 0) output = 'three';
        else if (number !== guildData.score + 1) output = 'six';
        else output = 'seven';
    }

    

    return output;
}

export { filterContent };