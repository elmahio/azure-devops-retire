const tl = require('azure-pipelines-task-lib/task');

async function run() {
    try {
        // Get inputs
        const verbose = tl.getBoolInput('verbose', false);
        const path = tl.getInput('path', false);
        const failOnVulnerabilities = tl.getBoolInput('failOnVulnerabilities', false);

        // Construct the retire command
        const args = ['--outputformat', 'json'];

        if (verbose) {
            args.push('--verbose');
        }

        if (path) {
            args.push('--path', path);
        }

        if (!failOnVulnerabilities) {
            args.push('--exitwith', '0');
        }

        // Install Retire.js
        tl.debug('Installing Retire.js...');
        await tl.exec('npm', ['install', '-g', 'retire'], {silent: true});

        // Run Retire.js and capture output
        tl.debug(`Executing retire with args: ${args.join(' ')}`);
        const result = tl.execSync('retire', args, {silent: true});

        const stdout = result.stdout?.toString() || '';
        let hasRealVulnerabilities = false;

        if (stdout.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(stdout);
                const matches = parsed.data || [];

                for (const entry of matches) {
                    const file = entry.file;
                    const results = Array.isArray(entry.results) ? entry.results : [];

                    for (const vuln of results) {
                        const vulnerabilities = Array.isArray(vuln.vulnerabilities) ? vuln.vulnerabilities : [];
                        const hasVulns = vulnerabilities.length > 0;

                        const component = vuln.component || 'unknown';
                        const version = vuln.version || 'unknown';
                        const identifiers = vuln.identifiers || {};
                        const cves = identifiers.CVE?.join(', ') || 'None';
                        const infoLinks = hasVulns
                            ? vulnerabilities.flatMap(v => v.info || []).join(', ') || 'None'
                            : 'None';
                        const severity = (vulnerabilities.length > 0 && vulnerabilities[0].severity)
                            ? vulnerabilities[0].severity
                            : 'none';

                        const message =
`- Version: ${version}
- File: ${file}
- Severity: ${severity}
- CVEs: ${cves}
- Info: ${infoLinks}`;

                        if (hasVulns) {
                            hasRealVulnerabilities = true;
                            tl.warning(`Vulnerable library found: ${component}\n${message}`);
                        } else if (verbose) {
                            console.log(`Library matched but no known vulnerabilities: ${component}\n${message}`);
                        }
                    }
                }
            } catch (err) {
                tl.warning('Could not parse JSON output from Retire.js');
            }
        } else {
            tl.warning('No JSON output detected from Retire.js');
        }

        if (hasRealVulnerabilities && failOnVulnerabilities) {
            tl.setResult(tl.TaskResult.Failed, 'Vulnerabilities were found and failOnVulnerabilities is true.');
        } else {
            tl.setResult(tl.TaskResult.Succeeded, 'Retire completed successfully');
        }
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, `Task failed: ${err.message}`);
    }
}

run();
