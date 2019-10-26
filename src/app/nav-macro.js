/*
    TWINE/SUGARCUBE NAVIGATION MACRO
    Copyright © 2019 Cliff Hall

    <<nav>>
        <<section name>>
            <<action targetPassage | '<<macroToExecute>>' ['filterCondition']>>
            [Optional text of first action link if different from target passage.]
            <<action targetPassage | '<<macroToExecute>>' ['filterCondition']>>
            [Optional text of second action link if different from target passage.]
            .
            .
            .
        <</section>>
        .
        .
        .
    <</scene>>

    RATIONALE
     * Write passage-to-passage navigation to be displayed at bottom of passage content.
     * Allow each passage to lead to other passages (or execute macros) by definable actions.
     * Let the actions of a nav section be displayed conditionally (e.g., only show 'Locked Door' you have the key).
     * Suppress display of navigation if there is a scene in progress (see scene macro).

    USAGE
     * Each section needs a unique name (in quotes if more than one word).
     * Section tags should contain only action tags as direct children.
     * Each section should contain at least one action.
     * Actions are rendered in a styled box at the bottom of the passage they're defined in.
     * Actions only include an opening tag; no closing <</action>> is required and will throw an error if present.
     * Actions MUST have EITHER a target passage name (in quotes if more than one word) OR a macro to be executed (in quotes).
     * Actions MAY optionally have a filter condition (using SugarCube expressions) as a second argument (in quotes).
     * Filter conditions are evaluated when the link is rendered; if false the link will not be displayed.
     * Use the SugarCube idiom of a backslash at the end of each section to remove unwanted blank lines: <</section>>\
     * It is also a good idea to add the following to your StoryInit passage: <<run Config.cleanupWikifierOutput = true>>

 */
(function () {
    'use strict';

    // Function to render the current navigation
    setup.renderCurrentNav = () => {
        // Bail if no current nav or if there is a current scene
        let currentNav = State.getVar('$currentNav');
        if (!currentNav || !!(State.getVar('$currentScene'))) return;

        // Nav Container
        let navContainer = $(State.getVar('$navContainer'));
        navContainer.empty();
        $(navContainer).show();

        // Add each section and its actions to the nav container
        currentNav.sections.forEach( section => {

            // Section Container
            let sectionContainer = $(document.createElement('div'));
            sectionContainer.addClass('section');
            sectionContainer.append(section.name);
            sectionContainer.appendTo(navContainer);

            // Link Container
            let linkContainer = $(document.createElement('div'));
            linkContainer.addClass('navlinks');
            linkContainer.appendTo(navContainer);

            // Action Links
            section.actions.forEach((action, index) => {
                let link = document.createElement('span');
                link.setAttribute('id', `action-${index}`);
                $(link).wiki(action).appendTo(linkContainer);
                if ($(link).text().trim().length ===0) $(link).remove();
            });
        });
    };

    // Process a navigation bar
    Macro.add('nav', {
        tags: null,
        handler : function () {

            // Create current nav
            State.setVar('$currentNav', {
                sections: []
            });

            // Create Nav Container
            let navContainer = document.createElement('div');
            navContainer.setAttribute('id', 'navContainer');
            $(navContainer).addClass('nav');
            $(navContainer).hide();
            State.setVar('$navContainer', navContainer);
            $(this.output).append(navContainer);

            // Parse contained sections
            $.wiki(this.payload[0].contents);

            // Render the nav
            setup.renderCurrentNav();
        }

    });

    // Process a section and its actions
    Macro.add('section', {
        tags: ['action'],
        handler : function () {

            let sectionName;

            // Throw error if section not named
            if (this.args.length < 1 || typeof this.args[0] !== 'string' || !this.args[0].trim()) {
                return this.error('You must name each section');
            } else {
                sectionName = this.args[0].trim();
            }

            // Get current nav
            let currentNav = State.getVar('$currentNav');

            // Create Section and add to current nav
            let section = {
                name: sectionName,
                actions: []
            };
            currentNav.sections.push(section);

            // Parse section contents
            section.actions = this.payload.splice(1).map((part,index) => {
                let retVal, link, arg1, arg2, contents, macro;
                if (part.name === 'action') {
                    // Get the first arg to the action
                    arg1 = String(part.args[0]).trim();
                    contents = String(part.contents).trim() || arg1;

                    // Create the link
                    if ((arg1.includes('<<') && arg1.includes('>>'))) {
                        link = `<<link "${contents}">>${arg1}<</link>>`;
                    } else {
                        link = `<<link "${contents}" "${arg1}">><<run State.setVar('$currentNav', undefined);>><</link>>`;
                    }

                    // If there's a filter condition, wrap the link with it
                    arg2 = part.args[1];

                    // Return the link
                    if (arg2) {
                        retVal = filterWrap(link, arg2, index-1);
                    } else {
                        retVal = link;
                    }
                }
                return retVal;
            });

            function filterWrap(link, condition){

                return`<<capture _filter>>\
                            <<run jQuery.wiki("<<set _filter = !!( ${condition} )>>")>>\
                            <<if _filter>>${link}<</if>>\
                       <</capture>>\
                `;
            }

        }
    });

}());
