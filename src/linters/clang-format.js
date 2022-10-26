const glob = require("glob");
const { quoteAll } = require("shescape");

const { run } = require("../utils/action");
const commandExists = require("../utils/command-exists");
const { initLintResult } = require("../utils/lint-result");

/** @typedef {import('../utils/lint-result').LintResult} LintResult */

/**
 * https://clang.llvm.org/docs/ClangFormat.html
 */
class ClangFormat {
	static get name() {
		return "clang_format";
	}

	/**
	 * Verifies that all required programs are installed. Throws an error if programs are missing
	 * @param {string} dir - Directory to run the linting program in
	 * @param {string} prefix - Prefix to the lint command
	 */
	static async verifySetup(dir, prefix = "") {
		if (!(await commandExists("clang-format"))) {
			throw new Error("clang-format is not installed");
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
		const pattern =
			extensions.length === 1 ? `**/*.${extensions[0]}` : `**/*.{${extensions.join(",")}}`;
		const globFiles = glob.sync(pattern, { cwd: dir, nodir: true });
		const escapedFiles = quoteAll(globFiles).join(" ");
		const fixArg = fix ? "-i" : "--dry-run";
		return run(`${prefix} clang-format ${fixArg} -Werror ${args} ${escapedFiles}`, {
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
		lintResult.isSuccess = output.status === 0;
		if (lintResult.isSuccess || !output) {
			return lintResult;
		}

		const lines = output.stderr.split(/\r?\n/);
		lintResult.error = lines.flatMap((line) => {
			const matched = line.match(/^(.*):(\d+):\d+: error: (.*)$/);
			if (!matched) {
				return [];
			}
			const lineNumber = parseInt(matched.at(2), 10);
			return {
				path: matched.at(1),
				firstLine: lineNumber,
				lastLine: lineNumber,
				message: matched.at(3),
			};
		});

		return lintResult;
	}
}

module.exports = ClangFormat;
