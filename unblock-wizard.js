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
 * Licence: MIT
 */

/* jshint maxerr: 999 */
/* globals mw, $, OO */
/* <nowiki> */

(function () {

$.when(
	$.ready,
	mw.loader.using([
		'mediawiki.util', 'mediawiki.api', 'mediawiki.Title',
		'mediawiki.widgets', 'oojs-ui-core', 'oojs-ui-widgets'
	])
).then(function () {
	if (!(mw.config.get('wgPageName').includes('Wikipedia:Unblock_wizard/') || mw.config.get('wgPageName').includes('User:Chaotic_Enby/Unblock_wizard/')) ||
		mw.config.get('wgAction') !== 'view') {
		return;
	}
	init();
});

var afc = {}, ui = {}, block = {};
window.afc = afc;
afc.ui = ui;

var config = {
	debounceDelay: 500,
	redirectionDelay: 1000,
	defaultAfcTopic: 'other'
};

// TODO: move to a separate JSON subpage, would be feasible once [[phab:T198758]] is resolved
var messages = {
	"document-title": "Wikipedia Unblock Wizard",
	"page-title": "Wikipedia Unblock Wizard",
	"explain-label": "Can you explain, in your own words, what you were blocked for?",
	"future-label": "If unblocked, what edits would you make and what (if applicable) would you do differently?",
	"other-label": "Is there anything else that may be helpful to your unblock request?",
	"accounts-label": "Please list all accounts you have used besides this one.",
	"so-label": "Have you taken the standard offer?",
	"explain-promo-label": "Can you explain, in your own words, why your edits were not promotional?",
	"coi-label": "What is your relationship with the subjects you have been editing about?",
	"future-promo-label": "If you are unblocked, what topic areas will you edit in?",
	"username-label": "If you were blocked for having a promotional username, what new username do you want to pick?",
	"clarification-label": "Is there anything specific you want to ask about your block?",
	"submit-label": "Submit",
	"footer-text": "<small>If you are not sure about what to enter in a field, you can skip it. If you need help, you can ask on <b>[[Special:MyTalk|your talkpage]]</b> with <b>{{[[Template:Help me|Help me]]}}</b> or get live help via <b>[[WP:IRCHELP|IRC]]</b> or <b>[[WP:DISCORD|Discord]]</b>.<br>Facing some issues in using this form? <b>[/w/index.php?title=Wikipedia_talk:Unblock_wizard&action=edit&section=new&preloadtitle=Issue%20with%20submission%20form&editintro=Wikipedia_talk:Unblock_wizard/editintro Report it]</b>.</small>",
	"submitting-as": "Submitting as User:$1",
	"validation-notitle": "User not found",
	"validation-invalidtitle": "User page does not exist.",
	"validation-missingtitle": "User page does not exist.",
	"status-processing": "Processing ...",
	"status-saving": "Saving talk page ...",
	"status-blank": "One or several required forms are missing.",
	"editsummary-main": "Submitting using [[Wikipedia:Unblock wizard]]",
	"status-redirecting": "Submission succeeded. Redirecting you to your talk page ...",
	"status-redirecting-utrs": "Submission succeeded. Redirecting you to UTRS ...",
	"status-not-blocked": "You are not currently blocked.",
	"status-error": "Due to an error, your unblock request could not be parsed. You can try to submit an unblock request manually by pasting the following on [[Special:MyTalk|your talk page]]:<br /><code>{{unblock | reason=Your reason here ~~" + "~~}}</code><br />If you are having difficulties, please [https://utrs-beta.wmflabs.org/ make a request through UTRS] and inform them of the issues you are encountering.",
	"captcha-label": "Please enter the letters appearing in the box below",
	"captcha-placeholder": "Enter the letters here",
	"captcha-helptip": "CAPTCHA security check. Click \"Submit\" again when done.",
	"error-saving-main": "An error occurred ($1). Please try again or ask for help on your talk page.",
	"error-main": "An error occurred ($1). Please try again or ask for help on your talk page.",
	"copyright-notice": "<small>By publishing changes, you agree to the [[:foundation:Special:MyLanguage/Policy:Terms of Use|Terms of Use]], and you irrevocably agree to release your contribution under the [[Wikipedia:Text of the Creative Commons Attribution-ShareAlike 4.0 International License|CC BY-SA 4.0 License]] and the [[Wikipedia:Text of the GNU Free Documentation License|GFDL]]. You agree that a hyperlink or URL is sufficient attribution under the Creative Commons license.</small>"
};

var infoLevels = {
	"process": ["6/61", "Eo_circle_blue_caret-double-right.svg"],
	"notice": ["9/93", "Eo_circle_amber_white_info.svg"],
	"success": ["3/3b", "Eo_circle_green_checkmark.svg"],
	"warning": ["9/93", "Eo_circle_amber_white_info.svg"],
	"error": ["e/ee", "Eo_circle_red_no-entry.svg"],
};

var questionLabels = [];
var questionFields = {'explain': 0, 'future': 0, 'other': 0, 'accounts': 0, 'so': 2, 'explain-promo': 0, 'coi': 0, 'future-promo': 0, 'username': 1, 'clarification': 0};
var required = {'explain': true, 'future': true, 'other': false, 'accounts': true, 'so': true, 'explain-promo': true, 'coi': true, 'future-promo': true, 'username': false, 'clarification': false};

var blockType = '';
var emptyFields = false;
var emptyFieldsWarned = false;
var mainPosition = -1;

function init() {
	for (var key in messages) {
		mw.messages.set('afcsw-' + key, messages[key]);
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
	afc.api = new mw.Api(apiOptions);
	afc.lookupApi = new mw.Api(apiOptions);
	
	afc.lookupApi.get({
		"action": "query",
		"meta": "userinfo",
		"uiprop": "blockinfo"
	}).then( setBlockData ).then( function ( block ) {
		blockType = mw.config.get('wgPageName').split('/');
		blockType = blockType[blockType.length - 1];
		
		switch (blockType) {
			case "Sockpuppet":
				questionLabels = ['accounts', 'so', 'other'];
				break;
			case "Promo":
				if(true) { // to replace by an api call to check if the block is username-related
					questionLabels = ['explain-promo', 'coi', 'future-promo', 'username', 'other'];
				} else {
					questionLabels = ['explain-promo', 'coi', 'future-promo', 'other'];
				}
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
			default:
				questionLabels = [];
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

function setBlockData(json) {
	var userinfo = json.query.userinfo;
	var errors = errorsFromPageData(userinfo);
	if (errors.length) {
		return block;
	}
	if("blockid" in userinfo){
		block.id = userinfo.blockid;
		block.by = userinfo.blockedby;
		block.reason = userinfo.blockreason;
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
				label: msg(label + '-label'),
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
	if (asUser && asUser !== mw.config.get('wgUserName')) {
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
	
	mw.track('counter.gadget_afcsw.opened');

	ui.submitButton.on('click', handleSubmit);

	initLookup();

	// The default font size in monobook and modern are too small at 10px
	mw.util.addCSS('.skin-modern .projectTagOverlay, .skin-monobook .projectTagOverlay { font-size: 130%; }');

	afc.beforeUnload = function (e) {
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
	$(window).on('beforeunload', afc.beforeUnload);
}

function initLookup() {
	afc.lookupApi.abort(); // abort older API requests

	var userTalk = "User talk:" + mw.config.get('wgUserName');
	if (!mw.config.get('wgUserName')) { // empty
		return; // here we should get the ip or something
	}

	// re-initialize
	afc.oresTopics = null;
	afc.talktext = null;
	afc.pagetext = null;

	afc.lookupApi.get({
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

	afc.pagetext = page.revisions[0].slots.main.content;
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

function imglink(img) {
	return '<img src="https://upload.wikimedia.org/wikipedia/commons/' + img[0] + '/' + img[1] + '/40px-' + img[1] + '.png" decoding="async" width="30" height="30" class="mw-file-element" srcset="https://upload.wikimedia.org/wikipedia/commons/thumb/' + img[0] + '/' + img[1] + '/60px-' + img[1] + '.png 1.5x">';
}

/**
 * @param {string} type
 * @param {string} message
 */
function setMainStatus(type, message) {
	if (mainPosition == -1) {
		mainPosition = ui.fieldset.items.length;
		ui.fieldset.addItems([
			ui.mainStatusLayout = new OO.ui.FieldLayout(ui.mainStatusArea = new OO.ui.LabelWidget({
			label: $('<tr>').append('<td style="vertical-align:top; padding-right: 5px;">' + imglink(infoLevels[type]) + '</td><td style="vertical-align:middle;">' + linkify(message)+ '</td>')
			}), {
				align: 'top'
			})
		]);
	} else {
		ui.mainStatusArea.setLabel($('<tr>').append('<td style="vertical-align:top; padding-right: 5px;">' + imglink(infoLevels[type]) + '</td><td style="vertical-align:middle;">' + linkify(message)+ '</td>'));
	}
}

function handleSubmit() {

	setMainStatus('process', msg('status-processing'));
	mw.track('counter.gadget_afcsw.submit_attempted');
	ui.submitButton.setDisabled(true);
	ui.mainStatusLayout.scrollElementIntoView();
	
	if (blockType == "IP_hardblock") {
		setMainStatus('success', msg('status-redirecting-utrs'));
		mw.track('counter.gadget_afcsw.submit_succeeded');
		$(window).off('beforeunload', afc.beforeUnload);
		setTimeout(function () {
			location.href = "https://utrs-beta.wmflabs.org/public/appeal/account";
		}, config.redirectionDelay);
	} else if (blockType != "IP" && !("id" in block)) {
		setMainStatus('warning', msg('status-not-blocked'));
	} else {
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
			var userTalk = "User talk:" + mw.config.get('wgUserName');
			if (!mw.config.get('wgUserName')) { // empty
				ui.fieldset.removeItems([ui.mainStatusLayout]);
				ui.submitButton.setDisabled(false);
				return; // really get the ip please
			}
		
			afc.api.get({
				"action": "query",
				"prop": "revisions|description",
				"titles": userTalk,
				"rvprop": "content",
				"rvslots": "main",
			}).then(function (json) {
				var apiPage = json.query.pages[0];
		
				var errors = errorsFromPageData(apiPage);
				if (errors.length) {
					// ui.fieldset.removeItems([ui.mainStatusLayout]);
					ui.submitButton.setDisabled(false);
					setMainStatus('error', msg('status-error'));
					return;
				}
		
				var text = prepareUserTalkText(apiPage);
		
				setMainStatus('process', msg('status-saving'));
				saveUserTalkPage(userTalk, text).then(function () {
					setMainStatus('success', msg('status-redirecting'));
					mw.track('counter.gadget_afcsw.submit_succeeded');
		
					$(window).off('beforeunload', afc.beforeUnload);
					setTimeout(function () {
						location.href = mw.util.getUrl(userTalk);
					}, config.redirectionDelay);
				}, function (code, err) {
					if (code === 'captcha') {
						ui.fieldset.removeItems([ui.mainStatusLayout, ui.talkStatusLayout]);
						ui.captchaLayout.scrollElementIntoView();
						mw.track('counter.gadget_afcsw.submit_captcha');
					} else {
						setMainStatus('error', msg('status-error'));
						mw.track('counter.gadget_afcsw.submit_failed');
						mw.track('counter.gadget_afcsw.submit_failed_' + code);
					}
					ui.submitButton.setDisabled(false);
				});
			}).catch(function (code, err) {
				setMainStatus('error', msg('status-error'));
				ui.submitButton.setDisabled(false);
				mw.track('counter.gadget_afcsw.submit_failed');
				mw.track('counter.gadget_afcsw.submit_failed_' + code);
			});
		}
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
		editParams.captchaid = afc.captchaid;
		editParams.captchaword = ui.captchaInput.getValue();
		ui.fieldset.removeItems([ui.captchaLayout]);
	}
	return afc.api.postWithEditToken(editParams).then(function (data) {
		if (!data.edit || data.edit.result !== 'Success') {
			if (data.edit && data.edit.captcha) {
				// Handle captcha for non-confirmed users

				var url = data.edit.captcha.url;
				afc.captchaid = data.edit.captcha.id; // abuse of global?
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

/**
 * @param {Object} page - page information from the API
 * @returns {string} final talk page text to save
 */
function prepareUserTalkText(page) {
	var text = page.revisions[0].slots.main.content;

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
		default:
			unblock += '\n{{unblock|reason=';
			
			for(var [i, label] of questionLabels.entries()){
				unblock += "'''''" + msg(label + '-label') + "'''''" + "{{pb}}" + ui.itemsInput[i].getValue() + "{{pb}}";
			}
				
			unblock += '}}~~' + '~~\n';
	}

	// insert it at the bottom
	text = text + unblock;

	return text;
}

/**
 * Load a JSON page from the wiki.
 * Use API (instead of $.getJSON with action=raw) to take advantage of caching
 * @param {string} page
 * @returns {jQuery.Promise<Record<string, any>>}
 **/
function getJSONPage (page) {
	return afc.api.get({
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
	return mw.msg.apply(mw, ['afcsw-' + key].concat(messageArgs));
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

})(); // File-level closure to protect functions from being exposed to the global scope or overwritten

/* </nowiki> */
