/**
 * MediaWiki:Unblock-wizard.js
 *
 * JavaScript used for submitting unblock requests.
 * Used on [[Wikipedia:Unblock wizard]].
 * Loaded via [[mw:Snippets/Load JS and CSS by URL]].
 * 
 * Edits can be proposed via [[Wikipedia talk:Unblock wizard]].
 *
 * Author: [[User:Chaotic Enby]] (derived from a script by [[User:SD0001]])
 * Licence: MIT (dual-licensed with CC-BY-SA 4.0 and GFDL 1.2)
 */

/* jshint maxerr: 999 */
/* globals mw, $, OO */
/* <nowiki> */

(async function () {



var wizard = {}, ui = {}, block = {};
window.wizard = wizard;
wizard.ui = ui;

var config = {
	debounceDelay: 500,
	redirectionDelay: 1000,
};

var demoMode = !!mw.util.getParamValue("demoMode");
var usernameBlock = mw.util.getParamValue("usernameBlock");

await new mw.Api().loadMessagesIfMissing(['wikimedia-copyrightwarning', 'copyrightwarning']);

// TODO: move to a separate JSON subpage, would be feasible once [[phab:T198758]] is resolved
var messages = {
	"document-title": "Wikipedia Unblock Wizard",
	"page-title": "Wikipedia Unblock Wizard",
	"explain-label": "Can you explain, in your own words, what you were blocked for?",
	"future-label": "If unblocked, what edits would you make and what (if applicable) would you do differently?",
	"other-label": "Is there anything else that may be helpful to your unblock request?",
	"accounts-label": "Please list all accounts you have used besides this one.",
	"so-label": "Have you taken the standard offer?",
	"explain-promo-label": "Can you explain, in your own words, why your edits were promotional?",
	"coi-label": "What is your relationship with the subjects you have been editing about?",
	"future-promo-label": "If you are unblocked, what topic areas will you edit in?",
	"username-label": (usernameBlock == "required" ? "What new username do you want to pick?" : "If your username was an issue, what new username do you want to pick?"),
	"standalone-username-label": "What new username do you want to pick?",
	"additional-reason-label": "Additional reason to be unblocked",
	"clarification-label": "Is there anything specific you want to ask about your block?",
	"submit-label": "Submit",
	"utrs-necessary": "It is necessary to appeal your block via UTRS. This is because your talk page access is disabled. [[Wikipedia:UTRS|Learn more about UTRS]]]",
	"utrs-necessary-confirm": "It is necessary to appeal your block via UTRS. This is because your talk page access is disabled. Select \"Confirm\" to learn more about UTRS.",
	"footer-text": "<small>If you are not sure about what to enter in a field, you can skip it. If you need help, you can ask on <b>[[Special:MyTalk|your talkpage]]</b> with <b>{{[[Template:Help me|Help me]]}}</b> or get live help via <b>[[WP:IRCHELP|IRC]]</b>.<br>Facing some issues in using this form? <b>Report it in {{irc|wikipedia-en-unblock}}</b>.</small>",
	"submitting-as": "Submitting as User:$1",
	"validation-notitle": "User not found",
	"validation-invalidtitle": "User page does not exist.",
	"validation-missingtitle": "User page does not exist.",
	"status-processing": "Processing ...",
	"status-saving": "Saving talk page ...",
	"status-blank": "One or several required forms are missing.",
	"editsummary-main": "Submitting using [[Wikipedia:Unblock wizard]]",
	"status-redirecting": "Submission succeeded. Redirecting you to your talk page ...",
	"status-redirecting-utrs": "Redirecting you to UTRS ...",
	"status-not-blocked": "You are not currently blocked.",
	"status-not-blocked-confirm": "You are not currently blocked. Select \"OK\" to activate demo mode, which will allow you to check out the workflow without posting a block request.",
	"status-error": "Due to an error, your unblock request could not be parsed. You can try to submit an unblock request manually by {{#if:$2|[$2 clicking this link] or}} pasting the following on [[Special:MyTalk|your talk page]]:<br /><code>$1</code><br />If you are having difficulties, please [[Wikipedia:UTRS|make a request through UTRS]] and inform them of the issues you are encountering.",
	"captcha-label": "Please enter the letters appearing in the box below",
	"captcha-placeholder": "Enter the letters here",
	"captcha-helptip": "CAPTCHA security check. Click \"Submit\" again when done.",
	"error-saving-main": "An error occurred ($1). Please try again or ask for help on your talk page.",
	"error-main": "An error occurred ($1). Please try again or ask for help on your talk page.",
	"copyright-notice": `<small>${mw.message('wikimedia-copyrightwarning').plain()}</small>`,
};

// var infoLevels = {
// 	"process": ["0/01", "OOjs_UI_icon_ellipsis-progressive.svg"],
// 	"notice": ["4/4b", "OOjs_UI_icon_information-yellow.svg"],
// 	"success": ["8/86", "OOjs_UI_icon_speechBubbleAdd-ltr-constructive.svg"],
// 	"redirect": ["2/23", "OOjs_UI_icon_articleRedirect-ltr-progressive.svg"],
// 	"warning": ["4/4b", "OOjs_UI_icon_information-yellow.svg"],
// 	"error": ["4/4e", "OOjs_UI_icon_error-destructive.svg"],
// };

var questionLabels = [];
var questionFields = {'explain': 0, 'future': 0, 'other': 0, 'accounts': 0, 'so': 2, 'explain-promo': 0, 'coi': 0, 'future-promo': 0, 'username': 1, 'clarification': 0, 'standalone-username': 1, 'additional-reason': 0};
var required = {'explain': true, 'future': true, 'other': false, 'accounts': true, 'so': true, 'explain-promo': true, 'coi': true, 'future-promo': true, 'username': (usernameBlock == "required"), 'additional-reason': false, 'clarification': false, 'standalone-username': true};

var blockType = '';
var emptyFields = false;
var emptyFieldsWarned = false;
var mainPosition = -1;

function init() {
	for (var key in messages) {
		mw.messages.set('ubw-' + key, messages[key]);
	}
	
	var apiOptions = {
		parameters: {
			format: 'json',
			formatversion: '2'
		},
		ajax: {
			headers: {
				'Api-User-Agent': 'w:en:MediaWiki:Unblock-wizard.js'
			}
		}
	};

	// Two different API objects so that aborts on the lookupApi don't stop the final
	// evaluate process
	wizard.api = new mw.Api(apiOptions);
	wizard.lookupApi = new mw.Api(apiOptions);
	
	wizard.lookupApi.get({
		"action": "query",
		"meta": "userinfo",
		"uiprop": "blockinfo"
	}).then( setBlockData ).then( function ( block ) {
		blockType = mw.config.get('wgPageName').split('/');
		if (blockType.includes("Demo")) {
			demoMode = true;
		}
		console.log(blockType)
		blockType = blockType[blockType.length - 1];
		
		switch (blockType) {
			case "Sockpuppet":
				questionLabels = ['accounts', 'so', 'other'];
				break;
			case "Promo":
				questionLabels = ['explain-promo', 'coi', 'future-promo', 'other'];
				break;
			case "Autoblock":
				questionLabels = [];
				break;
			case "IP_hardblock":
				questionLabels = [];
				break;
			case "Other":
				questionLabels = ['explain', 'future', 'other'];
				break;
			case "Clarification":
				questionLabels = ['clarification'];
				break;
			case "Username":
				questionLabels = ['standalone-username', 'additional-reason'];
				break;
			default:
				questionLabels = [];
		}
		
		if(usernameBlock && blockType != "Username" && blockType != "Clarification" && blockType != "IP_hardblock" && blockType != "Autoblock"  && blockType != "IP") {
			questionLabels = ['username'].concat(questionLabels);
		}
	
		document.title = msg('document-title');
		$('#firstHeading').text(msg('page-title'));
		
		mw.util.addCSS(
			// CSS adjustments for vector-2022: hide prominent page controls which are
			// irrelevant and confusing while using the wizard
			'.vector-page-toolbar { display: none } ' +
			'.vector-page-titlebar #p-lang-btn { display: none } ' + 
			
			// Hide categories as well, prevents accidental HotCat usage
			'#catlinks { display: none } '
		);
	
		constructUI();
	});
}

async function setBlockData(json) {
	var userinfo = json.query.userinfo;
	var errors = errorsFromPageData(userinfo);
	block.target = userinfo.name;
	if (errors.length) {
		return block;
	}
	if("blockid" in userinfo){
		block.id = userinfo.blockid;
		block.by = userinfo.blockedby;
		block.reason = userinfo.blockreason;
		block.notalk = userinfo.blockowntalk;
	}
	return block;
}

function constructUI() {
	ui.itemsLayout = [];
	ui.itemsInput = [];
	
	var copyrightEligible = false;
	
	for(var label of questionLabels){
		switch(questionFields[label]) {
			case 0:
				ui.itemsInput.push(new OO.ui.MultilineTextInputWidget({
						// placeholder: msg(label + '-placeholder'),
						multiline: true,
						autosize: true,
					}));
				copyrightEligible = true;
				break;
			case 1:
				ui.itemsInput.push(new OO.ui.TextInputWidget({
						// placeholder: msg(label + '-placeholder'),
						maxLength: 85,
					}));
				copyrightEligible = true;
				break;
			case 2:
				ui.itemsInput.push(new OO.ui.RadioSelectInputWidget({
						align: 'inline',
					}));
				ui.itemsInput[ui.itemsInput.length - 1].setOptions([{label:"Yes", data:"Yes."}, {label:"No", data:"No."}]);
				break;
			default:
				break;
		}
		ui.itemsLayout.push(new OO.ui.FieldLayout(ui.itemsInput[ui.itemsInput.length - 1], {
				label: msg(label + '-label') + (required[label] ? " (*)" : ""),
				align: 'top',
				// help: msg(label + '-helptip'),
				helpInline: true
			}));
	}
	
	ui.itemsLayout.push(ui.submitLayout = new OO.ui.FieldLayout(ui.submitButton = new OO.ui.ButtonWidget({
		label: msg('submit-label'),
		flags: [ 'progressive', 'primary' ],
	})));
	
	if(copyrightEligible){
		ui.itemsLayout.push(new OO.ui.FieldLayout(new OO.ui.LabelWidget({
			label: $('<div>')
				.append(linkify(msg('copyright-notice')))
		}), {
			align: 'top'
		}));
	}

	ui.fieldset = new OO.ui.FieldsetLayout({
		classes: [ 'container' ],
		items: ui.itemsLayout
	});

	ui.footerLayout = new OO.ui.FieldLayout(new OO.ui.LabelWidget({
		label: $('<div>')
			.append(linkify(msg('footer-text')))
	}), {
		align: 'top'
	});

	var asUser = mw.util.getParamValue('username');
	if (asUser && asUser !== block.target) {
		ui.fieldset.addItems([
			new OO.ui.FieldLayout(new OO.ui.MessageWidget({
				type: 'notice',
				inline: true,
				label: msg('submitting-as', asUser)
			}))
		], /* position */ 5); // just before submit button
	}

	// Attach
	$('#unblock-wizard-container').empty().append(ui.fieldset.$element, ui.footerLayout.$element);


	initLookup();

	if (blockType != "IP" && !("id" in block) && !demoMode) {
		setMainStatus('warning', msg('status-not-blocked'));
		demoMode = confirm(msg('status-not-blocked-confirm'));
		console.log(demoMode)
	}

	if (block.notalk) {
		ui.submitButton.setDisabled(true);
		setMainStatus('error', msg('utrs-necessary'));
		if (confirm(msg("utrs-necessary-confirm"))) {
			location.href = "/wiki/Wikipedia:UTRS";
		}
	} else {
		ui.submitButton.on('click', handleSubmit);
	}

	// The default font size in monobook and modern are too small at 10px
	mw.util.addCSS('.skin-modern .projectTagOverlay, .skin-monobook .projectTagOverlay { font-size: 130%; }');

	wizard.beforeUnload = function (e) {
		var changedContent = false;
		for (var [i, label] of questionLabels.entries()) {
			if (ui.itemsInput[i].getValue() != "" && questionFields[label] != 2) {
				changedContent = true;
			}
			if (ui.itemsInput[i].getValue() != "Yes." && questionFields[label] == 2) {
				changedContent = true;
			}
		}
		if(changedContent){
			e.preventDefault();
		}
		e.returnValue = '';
		return '';
	};
	$(window).on('beforeunload', wizard.beforeUnload);
}

function initLookup() {
	wizard.lookupApi.abort(); // abort older API requests

	var userTalk = "User talk:" + block.target;

	// re-initialize
	wizard.pagetext = null;

	wizard.lookupApi.get({
		"action": "query",
		"prop": "revisions|description|info",
		"titles": userTalk,
		"rvprop": "content",
		"rvslots": "main"
	}).then(setPrefillsFromPageData);
}

function setPrefillsFromPageData(json) {
	var page = json.query.pages[0];
	var preNormalizedTitle = json.query.normalized && json.query.normalized[0] &&
		json.query.normalized[0].from;
	var errors = errorsFromPageData(page);
	if (errors.length) {
		return;
	}

	wizard.pagetext = page.revisions[0].slots.main.content;
}

/**
 * @param {Object} page - from query API response
 * @returns {string[]}
 */
function errorsFromPageData(page) {
	if (!page || page.invalid) {
		return [msg('validation-invalidtitle')];
	}
	if (page.missing) {
		return [msg('validation-missingtitle')];
	}
	return [];
}

/**
 * @param {string} type
 * @param {string} message
 */
function setMainStatus(type, message) {
	if (mainPosition == -1) {
		mainPosition = ui.fieldset.items.length;
		ui.fieldset.addItems([
			ui.mainLabel = new OO.ui.MessageWidget( {
				align: 'top',
				type: type,
				label: $("<span/>").append(linkify(message))
			})
		]);
	} else {
		ui.mainLabel.setType(type);
		ui.mainLabel.setLabel($('<span/>').append(linkify(message)));
	}
}

function handleSubmit() {
	if (ui.submitButton.isDisabled()) {
		return;
	}
	setMainStatus('', msg('status-processing'));
	ui.submitButton.setDisabled(true);
	ui.mainLabel.scrollElementIntoView();
	
	var url = prepareUserTalkPageLink();
	var text = prepareUserTalkText();
	for(var [i, label] of questionLabels.entries()){
		if(required[label] && !ui.itemsInput[i].getValue()){
			emptyFields = true;
		}
	}
	if (emptyFields && !emptyFieldsWarned) {
		setMainStatus('warning', msg('status-blank'));
		emptyFieldsWarned = true;
		ui.submitButton.setDisabled(false);
	} else {
		var userTalk = "User talk:" + block.target;
		if (!block.target) { // empty
			ui.fieldset.removeItems([ui.mainLabel]);
			ui.submitButton.setDisabled(false);
			return; // really get the ip please
		}
	
		wizard.api.get({
			"action": "query",
			"prop": "revisions|description",
			"titles": userTalk,
			"rvprop": "content",
			"rvslots": "main",
		}).then(function (json) {
			var apiPage = json.query.pages[0];
	
			var errors = errorsFromPageData(apiPage);
			if (errors.length) {
				// ui.fieldset.removeItems([ui.mainLabel]);
				ui.submitButton.setDisabled(false);
				setMainStatus('error', msg('status-error').replace("$1", text).replace('$2', url));
				return;
			}
	
			setMainStatus('', msg('status-saving'));
			if (demoMode) {
				setMainStatus('success', 'Wikitext: <code style="display: block">' + text + '</code>\n\nPreload URL: <a href=\"' + url + '\" target=\"_blank\">' + url.replace("&", "&amp;").replace("<", "&lt;") + '</a>');
			} else {
				saveUserTalkPage(userTalk, apiPage.revisions[0].slots.main.content + text).then(function () {
					setMainStatus('success', msg('status-redirecting'));
		
					$(window).off('beforeunload', wizard.beforeUnload);
					setTimeout(function () {
						location.href = mw.util.getUrl(userTalk);
					}, config.redirectionDelay);
				}, function (code, err) {
					if (code === 'captcha') {
						ui.fieldset.removeItems([ui.mainLabel, ui.talkStatusLayout]);
						ui.captchaLayout.scrollElementIntoView();
					} else {
						setMainStatus('error', msg('status-error').replace('$1', text).replace('$2', url));
					}
					ui.submitButton.setDisabled(false);
				});
			}
		}).catch(function (code, err) {
			setMainStatus('error', msg('status-error').replace("$1", text).replace("$2", url));
			ui.submitButton.setDisabled(false);
		});
	}
}

function saveUserTalkPage(title, text) {

	// TODO: handle edit conflict
	var editParams = {
		"action": "edit",
		"title": title,
		"text": text,
		"summary": msg('editsummary-main')
	};
	if (ui.captchaLayout && ui.captchaLayout.isElementAttached()) {
		editParams.captchaid = wizard.captchaid;
		editParams.captchaword = ui.captchaInput.getValue();
		ui.fieldset.removeItems([ui.captchaLayout]);
	}
	return wizard.api.postWithEditToken(editParams).then(function (data) {
		if (!data.edit || data.edit.result !== 'Success') {
			if (data.edit && data.edit.captcha) {
				// Handle captcha for non-confirmed users

				var url = data.edit.captcha.url;
				wizard.captchaid = data.edit.captcha.id; // abuse of global?
				ui.fieldset.addItems([
					ui.captchaLayout = new OO.ui.FieldLayout(ui.captchaInput = new OO.ui.TextInputWidget({
						placeholder: msg('captcha-placeholder'),
						required: true
					}), {
						warnings: [ new OO.ui.HtmlSnippet('<img src=' + url + '>') ],
						label: msg('captcha-label'),
						align: 'top',
						help: msg('captcha-helptip'),
						helpInline: true,
					}),
				], /* position */ 6); // just after submit button // TODO: fix number
				// TODO: submit when enter key is pressed in captcha field

				return $.Deferred().reject('captcha');

			} else {
				return $.Deferred().reject('unexpected-result');
			}
		}
	});
}

function prepareUserTalkPageLink() {
	var url = new URL(location.origin + mw.config.get("wgArticlePath").replace("$1", "User_talk:" + mw.config.get("wgUserName")));
	url.searchParams.set("action", "edit");
	url.searchParams.set("section", "new");
	switch(blockType){
		case "Autoblock":
			if("id" in block){
				url.searchParams.set("editintro", `Template:Unblock-auto/editintro`);
				url.searchParams.set("preloadtitle", "Autoblock appeal");
				url.searchParams.set("preload", `Template:Unblock-auto/preload`);
				url.searchParams.set("preloadparams[0]", block.reason);
				url.searchParams.set("preloadparams[1]", block.by);
				url.searchParams.set("preloadparams[2]", block.id);
			}
			break;
		case "Clarification":
			url.searchParams.set("preload", `Help:Contents/helpmepreload`);
			url.searchParams.set("preloadparams[0]", ui.itemsInput[0].getValue());
			url.searchParams.set("preloadparams[1]", "");
			break;
		case "Username":
			url.searchParams.set("editintro", `Template:Unblock-un/editintro`);
			url.searchParams.set("preloadtitle", "Unblock request for change in username");
			url.searchParams.set("preload", `Template:Unblock-un/preload`);
			url.searchParams.append("preloadparams[0]", ui.itemsInput[1] ? ui.itemsInput[1].getValue() : '');
			url.searchParams.append("preloadparams[1]", ui.itemsInput[0].getValue());
			break;
		default:
			url.searchParams.set("editintro", `Template:Unblock/editintro`);
			url.searchParams.set("preloadtitle", "Unblock request");
			url.searchParams.set("preload", `Template:Unblock/preload`);
			var reason = '';
			for(var [i, label] of questionLabels.entries()){
				if(required[label] || ui.itemsInput[i].getValue()) {
					if(label == "username") {
						url.searchParams.set("editintro", `Template:Unblock-un/editintro`);
						url.searchParams.set("preloadtitle", "Unblock request with change in username");
						url.searchParams.set("preload", `Template:Unblock-un/preload`);
						url.searchParams.append("preloadparams[1]", ui.itemsInput[i].getValue());
					} else {
						reason += "'''''" + msg(label + '-label') + "'''''" + "{{pb}}" + ui.itemsInput[i].getValue() + "{{pb}}";
					}
				}
			}
			url.searchParams.append("preloadparams[0]", reason);
	}
	return url.toString();
}

/**
 * @param {Object} page - page information from the API
 * @returns {string} final talk page text to save
 */
function prepareUserTalkText() {
	var unblock = '';
	
	// put unblock template
	switch(blockType){
		case "Autoblock":
			if("id" in block){
				unblock += '\n{{unblock-auto|2=\u003Cnowiki>' + block.reason + '\u003C/nowiki>|3=' + block.by + '|4=' + block.id + '}}\n';
			} else {
				unblock += '\n{{unblock-auto|2=REASON|3=THE BLOCKING ADMIN|4=BLOCK ID}}\n';
			}
			break;
		case "Clarification":
			if(ui.itemsInput[0].getValue()){
				unblock += '\n{{Help me}}\n' + ui.itemsInput[0].getValue() + '\n~~' + '~~';
			} else {
				unblock += '\n{{Help me}}\n' + 'I would like a more detailed explanation for my block.' + '\n~~' + '~~';
			}
			break;
		case "Username":
			unblock += `\n{{unblock-un|1=${ui.itemsInput[0].getValue()}|reason=${ui.itemsInput[1] ? ui.itemsInput[1].getValue() : ''}}} \n`;
			break;
		default:
			unblockStart = '\n{{unblock|reason=';
			
			for(var [i, label] of questionLabels.entries()){
				if(required[label] || ui.itemsInput[i].getValue()) {
					if(label == "username") {
						unblockStart = '\n{{unblock-un|1=' + ui.itemsInput[i].getValue() + '|reason=';
					} else {
						unblock += "'''''" + msg(label + '-label') + "'''''" + "{{pb}}" + ui.itemsInput[i].getValue() + "{{pb}}";
					}
				}
			}
				
			unblock = unblockStart + "<small>The following request was written through the [[Wikipedia:Unblock wizard|unblock wizard]].</small>\n" + unblock + ' ~~' + '~~}}\n';
	}

	return unblock;
}

/**
 * Load a JSON page from the wiki.
 * Use API (instead of $.getJSON with action=raw) to take advantage of caching
 * @param {string} page
 * @returns {jQuery.Promise<Record<string, any>>}
 **/
function getJSONPage (page) {
	return wizard.api.get({
		action: 'query',
		titles: page,
		prop: 'revisions',
		rvprop: 'content',
		rvlimit: 1,
		rvslots: 'main',
		uselang: 'content',
		maxage: '3600', // 1 hour
		smaxage: '3600',
		formatversion: 2
	}).then(function (json) {
		var content = json.query.pages[0].revisions[0].slots.main.content;
		return JSON.parse(content);
	}).catch(function (code, err) {
		console.error(makeErrorMessage(code, err));
	});
}

/**
 * Expands wikilinks and external links into HTML.
 * Used instead of mw.msg(...).parse() because we want links to open in a new tab,
 * and we don't want tags to be mangled.
 * @param {string} input
 * @returns {string}
 */
function linkify(input) {
	return input
		.replace(/\{\{pb\}\}/g, '<br>')
		.replace(
			/\[\[:?(?:([^|\]]+?)\|)?([^\]|]+?)\]\]/g,
			function(_, target, text) {
				if (!target) {
					target = text;
				}
				return '<a target="_blank" href="' + mw.util.getUrl(target) +
					'" title="' + target.replace(/"/g, '&#34;') + '">' + text + '</a>';
			}
		)
		// for ext links, display text should be given
		.replace(
			/\[(\S*?) (.*?)\]/g,
			function (_, target, text) {
				return '<a target="_blank" href="' + target + '">' + text + '</a>';
			}
		);
}

function msg(key) {
	var messageArgs = Array.prototype.slice.call(arguments, 1);
	return mw.msg.apply(mw, ['ubw-' + key].concat(messageArgs));
}

function makeErrorMessage(code, err) {
	if (code === 'http') {
		return 'http: there is no internet connectivity';
	}
	return code + (err && err.error && err.error.info ? ': ' + err.error.info : '');
}

function debug() {
	Array.prototype.slice.call(arguments).forEach(function (arg) {
		console.log(arg);
	});
}


await $.when(
	$.ready,
	mw.loader.using([
		'mediawiki.util', 'mediawiki.api', 'mediawiki.Title',
		'mediawiki.widgets', 'oojs-ui-core', 'oojs-ui-widgets'
	])
);

if (!(mw.config.get('wgPageName').includes('Wikipedia:Unblock_wizard/')) ||
	mw.config.get('wgAction') !== 'view') {
	return;
}
init();

})(); // File-level closure to protect functions from being exposed to the global scope or overwritten

/* </nowiki> */
