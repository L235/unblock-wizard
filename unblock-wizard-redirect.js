/**
 * MediaWiki:Unblock-wizard-redirect.js
 *
 * JavaScript used for submitting unblock requests.
 * Additional script for MediaWiki:Unblock-wizard.js parsing blocks and redirecting users to the correct page.
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

(function () {

$.when(
	$.ready,
	mw.loader.using([
		'mediawiki.util', 'mediawiki.api', 'mediawiki.Title',
		'mediawiki.widgets', 'oojs-ui-core', 'oojs-ui-widgets'
	])
).then(function () {
	if (!(mw.config.get('wgPageName') == 'Wikipedia:Unblock_wizard' || mw.config.get('wgPageName') == 'User:Chaotic_Enby/Unblock_wizard') ||
		mw.config.get('wgAction') !== 'view') {
		return;
	}
	init();
});

var wizard = {}, ui = {}, block = {};
window.wizard = wizard;
wizard.ui = ui;
var demoMode = false;

// For each block template, links the relevant subpage
var blockTemplates = {
	"anonblock": ["", "", ""],
	"school block": ["", "", ""],
	"rangeblock": ["", "", ""],
	"blocked proxy": ["", "", ""],
	"uw-upeblock": ["Promo", "Undisclosed paid editing", "You have been blocked for making promotional edits to topics in which you have a financial stake, without adhering to the mandatory [[Wikipedia:Paid-contribution disclosure|paid editing disclosure requirements]]. Paid advocacy is a form of [[Wikipedia:Conflict of interest|conflict of interest]] (COI) editing which involves being compensated by a person, group, company or organization to use Wikipedia to promote their interests."],
	"uw-ublock": ["Username", "", "Your account has been blocked from editing Wikipedia because your username does not comply with Wikipedia's [[Wikipedia:Username policy#Guidance for new users|username policy]]. Your username is the principal reason for your block, and you are welcome to continue editing after changing it."],
	"uw-uhblock": ["", "", ""],
	"uw-causeblock": ["", "", ""],
	"uw-ublock-wellknown": ["", "", ""],
	"uw-ublock-double": ["", "", ""],
	"uw-uhblock-double": ["", "", ""],
	"uw-softerblock": ["Username", "Promotional username", "You have been blocked because your username gives the impression that the account represents a group, team, club, organization, company, product, department, or website. Your username is the principal reason for your block, and you are welcome to continue editing after changing it."],
	"uw-spamublock": ["Promo", "Promotional editing and username", "You have been blocked for [[WP:Spam|advertising or promotion]]. Also, your username gives the impression that the account represents a business, organisation, group, website, or role."],
	"uw-spamblacklistblock": ["Promo", "Promotional editing", "You have been blocked for adding external links which are blocked by the [[Wikipedia:Spam blacklist|spam blacklist]]."],
	"uw-vaublock": ["", "", ""],
	"checkuser block": ["", "", ""],
	"checkuserblock-wide": ["", "", ""],
	"checkuserblock-account": ["", "", ""],
	"tor": ["", "", ""],
	"webhostblock": ["", "", ""],
	"colocationwebhost": ["", "", ""],
	"oversightblock": ["", "", ""],
	// The following are not in the default menu at [[MediaWiki:Ipbreason-dropdown]]
	"uw-adblock": ["Promo", "Promotional editing", "You have been blocked for [[Wikipedia:What Wikipedia is not#Wikipedia is not a soapbox|advertising or self-promoting]] in violation of the [[Wikipedia:Conflict of interest|conflict of interest]] and [[Wikipedia:Notability (organizations and companies)|notability]] guidelines."],
	"uw-sblock": ["Promo", "Promotional editing", "You have been blocked for adding [[Wikipedia:Spam|spam]] links."],
	"uw-asblock": ["Promo", "Promotional editing", "You have been blocked for adding [[Wikipedia:Spam|spam]] links."],
	"uw-soablock": ["Promo", "Promotional editing", "You have been blocked because your account is being used only for [[Wikipedia:Spam|advertising or promotion]]."],
	"uw-sockblock": ["Sockpuppet", "Sockpuppetry", "You have been blocked for [[Wikipedia:Sockpuppetry|abusing multiple accounts]]. Note that multiple accounts are [[Wikipedia:Sockpuppetry#Legitimate uses|allowed]], but <b>not for [[Wikipedia:Sockpuppetry#Inappropriate uses of alternative accounts|illegitimate]] reasons</b>."],
};

function init() {
	var apiOptions = {
		parameters: {
			format: 'json',
			formatversion: '2'
		},
		ajax: {
			headers: {
				'Api-User-Agent': 'w:en:MediaWiki:Unblock-wizard-redirect.js'
			}
		}
	};
	
	wizard.api = new mw.Api(apiOptions);
	wizard.lookupApi = new mw.Api(apiOptions);
	
	wizard.lookupApi.get({
		"action": "query",
		"meta": "userinfo",
		"uiprop": "blockinfo"
	}).then( setBlockData ).then( function ( reason ) {
		ui.itemsLayout = [];
		if(reason && reason in blockTemplates) {
			ui.itemsLayout.push(new OO.ui.FieldLayout(new OO.ui.LabelWidget({
				label: $('<div>').css("margin-top", "20px").append(linkify('<span style="font-size: 125%">Your current block status:</span><br><span style="font-size: 175%">Blocked for ' + blockTemplates[reason][1].toLowerCase() + '</span><br>' + blockTemplates[reason][2]))}), { align: 'top' }));
			generateButton(ui.itemsLayout, "Appeal my " + blockTemplates[reason][1].toLowerCase() + " block", true, redirToPage(blockTemplates[reason][0]));
			// generateButton(ui.itemsLayout, "Learn more about " + blockTemplates[reason][1].toLowerCase() + " blocks", true);
			generateButton(ui.itemsLayout, "Appeal a different kind of block", false, activateDefaultMode);
		}
		else if(reason === null) { // Not blocked, this check is needed to avoid cases where the block reason is empty
			// TODO: Perform a check on the underlying IP
			// TODO: Check the underlying IP for global blocks
			
			// Add a "You are not currently blocked" message
			ui.itemsLayout.push(new OO.ui.FieldLayout(new OO.ui.LabelWidget({
				label: $('<div>').css("margin-top", "20px").append(linkify('<span style="font-size: 175%">You are not currently blocked</span><br>You can still test the unblock wizard in <b>demo mode</b>, which will allow you to look at the code generated by the wizard without posting it on your talk page.'))}), { align: 'top' }));
			
			// Link to demo mode
			generateButton(ui.itemsLayout, "Enter demo mode", true, activateDemoMode);
			generateButton(ui.itemsLayout, "My block was not detected", false, activateDefaultMode);
		}
		else {
			// Link to the current buttons
			generateDefaultButtons(ui.itemsLayout);
		}
		ui.fieldset = new OO.ui.FieldsetLayout({
			classes: [ 'container' ],
			items: ui.itemsLayout
		});
		$('#unblock-wizard-container').empty().append(ui.fieldset.$element);
	});
	
	function activateDemoMode() {
		demoMode = true;
		ui.itemsLayout = [];
		generateDefaultButtons(ui.itemsLayout, args="demoMode=true");
		ui.fieldset = new OO.ui.FieldsetLayout({
			classes: [ 'container' ],
			items: ui.itemsLayout
		});
		$('#unblock-wizard-container').empty().append(ui.fieldset.$element);
	}
	
	function activateDefaultMode() {
		ui.itemsLayout = [];
		generateDefaultButtons(ui.itemsLayout);
		ui.fieldset = new OO.ui.FieldsetLayout({
			classes: [ 'container' ],
			items: ui.itemsLayout
		});
		$('#unblock-wizard-container').empty().append(ui.fieldset.$element);
	}
	
	function redirToPage(page, args="") {
		return function() {
			location.href = mw.Title.newFromText( mw.config.get('wgPageName') + '/' + page ).getUrl() + "?withJS=MediaWiki:Unblock-wizard.js" + (args ? "&" + args : "");
		};
	}
	
	function redirToExtLink(link, args="") {
		return function() {
			location.href = link + "?withJS=MediaWiki:Unblock-wizard.js" + (args ? "&" + args : "");
		};
	}
	
	function generateButton(itemsLayout, label, isProgressive, buttonAction=null) {
		itemsLayout.push(new OO.ui.FieldLayout(button = new OO.ui.ButtonWidget({
			label: label, flags: (isProgressive ? [ 'progressive', 'primary' ] : [ ])})));
		if (buttonAction) {
			button.on('click', buttonAction);
		}
	}
	
	function generateDefaultButtons(itemsLayout, args="") {
		ui.itemsLayout.push(new OO.ui.FieldLayout(new OO.ui.LabelWidget({
				label: $('<div>').append(linkify('Which of the following best describes your current situation?'))}), { align: 'top' }));
		generateButton(ui.itemsLayout, "I was blocked for being a sockpuppet", true, redirToPage("Sockpuppet", args));
		generateButton(ui.itemsLayout, "I was blocked for promotional activity", true, redirToPage("Promo", args));
		generateButton(ui.itemsLayout, "I was \"automatically blocked\"", true, redirToPage("Autoblock", args));
		generateButton(ui.itemsLayout, "My IP address has been blocked", true, redirToPage("IP hardblock", args));
		generateButton(ui.itemsLayout, "I was blocked only because of my username", true, redirToPage("Username", args));
		generateButton(ui.itemsLayout, "I was blocked for something else", true, redirToPage("Other", args));
		generateButton(ui.itemsLayout, "I was blocked globally", true, redirToExtLink("https://meta.wikimedia.org/wiki/Stewards/Wizard", args));
		generateButton(ui.itemsLayout, "I would like to know why I was blocked", false, redirToPage("Clarification", args));
	}
	
	function setBlockData(json) {
		var userinfo = json.query.userinfo;
		if(userinfo && "blockid" in userinfo){
			block.id = userinfo.blockid;
			block.by = userinfo.blockedby;
			block.reason = userinfo.blockreason;
			block.template = block.reason.match(/\{\{(.*)\}\}/)[1].toLowerCase();
			return block.template;
		}
		return null;
	}
}

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

})(); // File-level closure to protect functions from being exposed to the global scope or overwritten

/* </nowiki> */
