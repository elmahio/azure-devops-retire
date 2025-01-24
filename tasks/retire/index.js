const tl = require('azure-pipelines-task-lib/task');

async function run() {
    try {
        // Get inputs
        const verbose = tl.getBoolInput('verbose', false);
        const path = tl.getInput('path', false);
        const failOnVulnerabilities = tl.getBoolInput('failOnVulnerabilities', false);

        // Construct the retire command
        let command = 'retire --colors';

        if (verbose) {
            command += ' --verbose';
        }

        if (path) {
            command += ` --path ${path}`;
        }

        if (!failOnVulnerabilities) {
            command += ' --exitwith 0';
        }

        // Install Retire.js
        tl.debug('Installing Retire.js...');
        await tl.exec('npm', ['install', '-g', 'retire']);

        // Run Retire.js
        tl.debug(`Executing command: ${command}`);
        await tl.exec('sh', ['-c', command]); // Use 'sh -c' for cross-platform compatibility

        tl.setResult(tl.TaskResult.Succeeded, 'Retire completed successfully');
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, `Task failed: ${err.message}`);
    }
}

run();