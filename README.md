- By [User:Chaotic Enby](https://en.wikipedia.org/wiki/User:Chaotic_Enby) (https://github.com/IlyasLebleu), derived from a script by [User:SD0001](https://en.wikipedia.org/wiki/User:SD0001)
- MIT License (dual-licensed with CC-BY-SA 4.0 and GFDL 1.2)

# unblock-wizard-redirect.js

This is the "pilot" script, executed on [Wikipedia:Unblock wizard](https://en.wikipedia.org/wiki/Wikipedia:Unblock_wizard). It serves to identify whether a user is blocked, and which block template has been used, to redirect them to the relevant page if possible. It also provides a way to access demo mode, where the changes will be given as raw code but not added to the user talk page, and a comprehensive menu linking to the various unblock forms.

# unblock-wizard.js

This script deals with the unblock forms themselves, and is executed on subpages of [Wikipedia:Unblock wizard](https://en.wikipedia.org/wiki/Wikipedia:Unblock_wizard). Arguments (such as demo mode, or the presence of a username field) are passed through the URL from the other script.

The following unblock forms are available:
* Username
* Promotional editing
* Sockpuppetry
* Autoblock
* IP hardblock
* IP block
* Generic unblock request

A help form is also available, adding the {{Help me}} template instead of an unblock request.
