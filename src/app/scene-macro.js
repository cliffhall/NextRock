/*
    SCENE MACRO

    <<scene name>>
        <<branch name ['start']>>
            Text of scene.
            <<action branch | '<<macroToExecute>>' ['filterCondition']>>
            Text of first action.
            <<action branch | '<<macroToExecute>>' ['filterCondition']>>
            Text of second action.
            .
            .
            .
        <</branch>>
        .
        .
        .
    <</scene>>

 */
(function () {
    'use strict';

    // Function to render the current branch
    setup.renderCurrentBranch = () => {

        // Bail if no current scene or branches
        let currentScene = State.getVar('$currentScene');
        if (!currentScene || !currentScene.branch || !currentScene.branches) return;

        // Get the current branch text and actions
        let branch = currentScene.branches[currentScene.branch];
        let text = branch[0];
        let actions = branch.slice(1);

        // Empty the scene container
        let container = $(State.getVar('$sceneContainer'));
        container.empty();

        // Add the branch text to the scene container
        container.wiki(text);

        // Add the branches actions (if any) to the scene container
        if (actions.length) {
            let list = $(document.createElement('ul'));
            list.appendTo(container);
            actions.forEach((action, index) => {
                let bullet = document.createElement('li');
                bullet.setAttribute('id', `action-${index}`);
                $(bullet).wiki(action).appendTo(list);
                if ($(bullet).text().trim().length ===0) $(bullet).remove();
            });

        }
    };

    Macro.add('scene', {
        tags: null,
        handler : function () {

            // Throw error if scene not named
            if (this.args.length < 1 || typeof this.args[0] !== 'string' || !this.args[0].trim()) {
                return this.error('You must name each scene');
            }

            // Set the current scene to this one, and reset the current branch
            State.setVar('$currentScene', {
                scene: this.args[0],
                branch: null,
                branches: {}
            });

            // Create scene container, store it, and add it to the DOM
            let container = document.createElement('div');
            container.setAttribute('id', 'sceneContainer');
            State.setVar('$sceneContainer', container);
            $(this.output).append(container);

            // Parse contained branches
            $.wiki(this.payload[0].contents);
        }
    });

    Macro.add('branch', {
        tags: ['action'],
        handler : function () {

            let branchName, isCurrent = false;
            let currentScene = State.getVar('$currentScene');

            // Throw error if branch not named
            if (this.args.length < 1 || typeof this.args[0] !== 'string' || !this.args[0].trim()) {
                return this.error('You must name each branch');
            } else {
                branchName = this.args[0].trim();
            }

            // Set the current branch to this one if no branch is set
            if (!currentScene.branch && this.args.length === 2 || this.args[1] === 'start') {
                currentScene.branch = branchName;
                isCurrent = true;
            }

            // Parse branch contents
            currentScene.branches[branchName] = this.payload.map((part,index) => {
                let retVal, link, arg1, arg2, contents;
                switch (part.name) {
                    case 'branch':
                        retVal = String(part.contents).trim();
                        break;
                    case 'action':
                        // Get the first arg to the action
                        arg1 = String(part.args[0]).trim();
                        contents = String(part.contents).trim();
                        // If it isn't a macro, treat it as a branch name
                        if (!(arg1.includes('<<') && arg1.includes('>>'))) {
                            arg1 = `<<set $currentScene.branch to "${arg1}">><<run setup.renderCurrentBranch()>>`
                        }

                        // Create the link
                        link = `<<link "${contents}">>${arg1}<</link>>`;

                        // If there's a filter condition, wrap the link with it
                        arg2 = part.args[1];

                        // Return the link
                        if (arg2) {
                            retVal = filterWrap(link, arg2, index-1)
                        } else {
                            retVal = link
                        }

                        break;
                }
                return retVal;
            });

            // Render branch if current
            if (isCurrent) {
                setup.renderCurrentBranch();
            }

            function filterWrap(link, condition, index){

                return`<<capture _filter>>\
                                <<run jQuery.wiki("<<set _filter = !!( ${condition} )>>")>>\
                                <<if _filter>>\
                                    ${link}\
                                <</if>>\
                            <</capture>>\
                `;
            }

        }
    });

}());