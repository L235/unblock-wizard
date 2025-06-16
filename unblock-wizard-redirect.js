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
	if (!(mw.config.get('wgPageName') == 'Wikipedia:Unblock_wizard' || mw.config.get('wgPageName') == 'User:Chaotic_Enby/Unblock_wizard') ||
		mw.config.get('wgAction') !== 'view') {
		return;
	}
	init();
});

var block = {};

// For each block template, links the relevant subpage
var blockTemplates = {
	"test": "test",
};

function init() {
	console.log("a");
	
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
	
	afc.api = new mw.Api(apiOptions);
	afc.lookupApi = new mw.Api(apiOptions);
	console.log("b");
	
	afc.lookupApi.get({
		"action": "query",
		"meta": "userinfo",
		"uiprop": "blockinfo"
	}).then( setBlockData ).then( function ( reason ) {
		console.log(reason);
		if(reason && reason in blockTemplates) {
			targetPage = mw.config.get('wgPageName') + '/' + blockTemplates[reason];
			location.href = location.href = mw.Title.newFromText( targetPage ).getUrl();
		}
	});
	
	function setBlockData(json) {
		var userinfo = json.query.userinfo;
		if(userinfo && "blockid" in userinfo){
			block.id = userinfo.blockid;
			block.by = userinfo.blockedby;
			block.reason = userinfo.blockreason;
			block.template = block.reason.match(/\{\{(.*)\}\}/)[1];
			return block.template;
		}
		return null;
	}
}

})(); // File-level closure to protect functions from being exposed to the global scope or overwritten

/* </nowiki> */
