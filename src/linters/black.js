const { run } = require("../utils/action");
const commandExists = require("../utils/command-exists");
const { parseErrorsFromDiff } = require("../utils/diff");
const { initLintResult } = require("../utils/lint-result");

/** @typedef {import('../utils/lint-result').LintResult} LintResult */

/**
 * https://black.readthedocs.io
 */
class Black {
	static get name() {
		return "Black";
	}

	/**
	 * Verifies that all required programs are installed. Throws an error if programs are missing
	 * @param {string} dir - Directory to run the linting program in
	 * @param {string} prefix - Prefix to the lint command
	 */
	static async verifySetup(dir, prefix = "") {
		// Verify that Python is installed (required to execute Black)
		if (!(await commandExists("python"))) {
			throw new Error("Python is not installed");
		}

		// Verify that Black is installed
		try {
			run(`${prefix} black --version`, { dir });
		} catch (err) {
			throw new Error(`${this.name} is not installed`);
		}
	}

	/**
	 * Runs the linting program and returns the command output
	 * @param {object} props - Params
	 * @param {string} props.dir - Directory to run the linter in
	 * @param {string[]} props.extensions - File extensions which should be linted
	 * @param {string} props.args - Additional arguments to pass to the linter
	 * @param {boolean} props.fix - If linter should attempt to fix code style issues automatically
	 * @param {string} props.prefix - Prefix to the lint binary
	 * @param {string} props.files - Files to lint
	 * @param {string} props.linterPrefix - Prefix to the entire lint command
	 * @returns {{status: number, stdout: string, stderr: string}} - Output of the lint command
	 */
	static lint({
		dir,
		extensions,
		args = "",
		fix = false,
		prefix = "",
		files = '"."',
		linterPrefix = "",
	}) {
		const exts = `^.*\\.(${extensions.join("|")})$`;
		const fixArg = fix ? "" : "--check --diff";
		return run(`${prefix} black ${fixArg} --include "${exts}" ${args} "."`, {
			dir,
			ignoreErrors: true,
		});
	}

	/**
	 * Parses the output of the lint command. Determines the success of the lint process and the
	 * severity of the identified code style violations
	 * @param {string} dir - Directory in which the linter has been run
	 * @param {{status: number, stdout: string, stderr: string}} output - Output of the lint command
	 * @returns {LintResult} - Parsed lint result
	 */
	static parseOutput(dir, output) {
		const lintResult = initLintResult();
		lintResult.error = parseErrorsFromDiff(output.stdout);
		lintResult.isSuccess = output.status === 0;
		return lintResult;
	}
}

module.exports = Black;
