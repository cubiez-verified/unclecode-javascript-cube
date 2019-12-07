const fs = require('fs');
const shell = require("shelljs");
const path = require("path");
const Octokit = require("@octokit/rest");
const axios = require("axios");

const run = async () => {
   
    const cube = JSON.parse(fs.readFileSync(process.env.NODE_CUBE, 'utf8')).commits[0].message.split(".")[0];
    const userInfo = JSON.parse(fs.readFileSync(`${cube}.user.json`, 'utf8'));
    //const userInfo = cubeInfo.user;

    console.log(cube, userInfo);

    let template_owner = "KidoCode";

    console.log("Sending to server...");
    let master_token;
    try {
        let response = await axios.get('https://webhooks.mongodb-stitch.com/api/client/v2.0/app/kportal-grmuv/service/kportalWeb/incoming_webhook/getMasterToken?secret=ef377a4ad4');
        master_token = response.data['token']
    } catch (e) {
        console.log(e);
        process.exit(0);
    }

    let octokit = new Octokit({
        auth: "token " + master_token
    });
    // get first lesson from qhub
    let resp = await octokit.repos.getContents({
        owner: template_owner,
        repo: `${cube}-qhub`,
        path: `cube.json`,
        headers: {
            'accept': 'application/vnd.github.VERSION.raw'
        }
    })

    let initLessonBranch = JSON.parse(resp.data)['index'][0];
    console.log("first lesson: ", initLessonBranch);

    const _silent = true;
    
    console.log("fetching the first lesson");

    shell.exec(`git checkout --orphan ${initLessonBranch}`, {silent: _silent});
    shell.exec(`git rm -rf .`, {silent: _silent});
    shell.exec(`git pull https://unclecode:${master_token}@github.com/KidoCode/${cube}-qhub.git ${initLessonBranch}`, {silent: _silent});

    let cubeInfo = {}
    cubeInfo.current = {lesson: initLessonBranch}
    shell.exec(`git checkout master`, {silent: _silent});
    fs.writeFileSync(`${cube}.cube.json`, JSON.stringify(cubeInfo))

    shell.exec(`git add --all`, {silent: _silent});
    shell.exec(`git commit -m 'Add first lesson branch'`, {silent: _silent});
    shell.exec(`git push https://unclecode:${master_token}@github.com/cubiez-verified/${userInfo.username}-${cube}-cube.git --all`, {silent: _silent});

    //const url = 'https://fb177c33.ngrok.io/user/token';
    const url = 'https://webhooks.mongodb-stitch.com/api/client/v2.0/app/kportal-grmuv/service/kportalWeb/incoming_webhook/getUserToken?secret=5eaae879cf';
    let token;
    try {
        let response = await axios.post(
            url,
            {"username": userInfo.username}
        );
        token = response.data['token']
    } catch (e) {
        console.log(e);
        process.exit(0);
    }

    octokit = new Octokit({
        auth: "token " + token
    });
    
    console.log("fork to student repo...");
    try {
        await octokit.repos.createFork({
            owner: 'cubiez-verified',
            repo: `${userInfo.username}-${cube}-cube`
        })
        console.log("Done");
        return true
    } catch (e) {
        console.log("Oops", e);
        throw e
    }

}

run();
