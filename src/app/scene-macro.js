/*
    NARRATIVE MACRO SET FOR TWINE/SUGARCUBE
    > SCENE & BRANCH MACROS
    Copyright © 2019 Cliff Hall

    In a 'scene' tagged passage:
    <<scene 'name'>>
        <<branch name [start]>>
            Text of branch.
            .
            .
            .
            <<action targetBranch | '<<macroToExecute>>' ['filterCondition']>>Text of action link.
            <<extra targetBranch '<<macroToExecute>>' ['filterCondition']>>Text of extra link.
            <<cut targetPassage  ['<<macroToExecute>>'] ['filterCondition']>>Text of cut link.
            .
            .
            .
        <</branch>>
        .
        .
        .
    <</scene>>

    RATIONALE
     * Easily write branching narratives using text, macros, and HTML.
     * Start from any branch, not just the first one (good for development).
     * Allow each branch to lead to other branches (or execute macros) by definable actions.
     * Let the actions of a branch be displayed conditionally (e.g., only show 'Use space wrench' if you have one).
     * Don't render scenes that have been previously completed if they are revisited.

    USAGE
     * Each Scene needs a unique name (in quotes if more than one word).
     * Unnamed Scenes will throw an error when processed.
     * Scenes should be defined one per 'scene' tagged passage.
     * Scene macros should contain only Branch tags as direct children.
     * Scenes can contain any number of Branches.
     * Each Branch needs a unique name (in quotes if more than one word).
     * One and only one Branch may have start as its second argument (no quotes).
     * The first branch of a scene will be rendered first unless another has the start argument.
     * The optional start argument is intended for testing purposes, so you can skip branches of a scene during development.
     * Branches contain text (which can include SugarCube macros and HTML markup) followed by an optional number of Actions.
     * Actions are links rendered as a bulleted list after the text of the Branch they belong to.
     * Actions only include an opening tag; no closing <</action>> is required and will throw an error if present.
     * Actions MUST have EITHER a target Branch name (in quotes if more than one word) OR a macro to be executed (in quotes).
     * Actions MAY optionally have a filter condition (using SugarCube expressions) as a second argument (in quotes).
     * Extras are like actions but have BOTH a passage name AND macro to exectute, with an optional filter condition.
     * Filter conditions are evaluated when the link is rendered. If false, the link will not be displayed.
     * When a Branch is reached which has no Actions, the Scene is marked as completed and will not render if visited again.
     * Cuts are like Actions except they target another Passage instead of a Branch of the current Scene.
     * Cuts support macros or filter conditions in the second argument, and filter condition in the third arg if macro is in second.
     * When the user clicks on the link for a Cut, the Scene is marked as completed and will not render if visited again.
     * Cuts and Actions can be defined in any order.
     * Use the SugarCube idiom of a backslash at the end of each branch to remove unwanted blank lines: <</branch>>\
     * It is also a good idea to add the following to your StoryInit passage: <<run Config.cleanupWikifierOutput = true>>

 */
(function () {
    'use strict';

    setup.sceneBranchTaken = (scene, branch) => {
        $(document).trigger({
            type : ':scene-branch-taken',
            scene : scene,
            branch: branch
        });
    };

    // Function to render the current branch of the current scene
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

        // If actions are present, render them, otherwise mark scene complete
        if (actions.length) {
            // Add the branch's actions to the scene container
            let list = $(document.createElement('ul'));
            list.appendTo(container);
            actions.forEach((action, index) => {
                let bullet = document.createElement('li');
                bullet.setAttribute('id', `action-${index}`);
                $(bullet).wiki(action).appendTo(list);
                if ($(bullet).text().trim().length ===0) $(bullet).remove();
            });
        } else {
            State.setVar('$endingBranchShown', true);
            setup.markCurrentSceneComplete();
        }

    };

    // Mark scene complete and clear the current scene
    setup.markCurrentSceneComplete = () => {
        let currentScene = State.getVar('$currentScene');
        if (!currentScene) return;
        let completed = State.getVar('$completedScenes');
        completed.push(currentScene.name);
        State.setVar('$currentScene', null);
        if (!!State.getVar('$currentNav')) setup.renderCurrentNav();
    };

    // Function to check if a given scene has been completed
    setup.hasSceneBeenCompleted = sceneName => {
        let retVal = false;
        let completedScenes = State.getVar('$completedScenes');
        if (Array.isArray(completedScenes)) {
            if (completedScenes.includes(sceneName)) retVal = true;
        } else {
            completedScenes = [];
            State.setVar('$completedScenes', completedScenes);
        }
        return retVal;
    };

    // Process a scene
    Macro.add('scene', {
        tags: null,
        handler : function () {

            // Throw error if scene not named
            if (this.args.length < 1 || typeof this.args[0] !== 'string' || !this.args[0].trim()) {
                return this.error('You must name each scene');
            }

            // Process scene if it hasn't been completed
            let sceneName = this.args[0].trim();
            if (!setup.hasSceneBeenCompleted(sceneName)) {

                // Set the current scene to this one, and reset the current branch
                State.setVar('$currentScene', {
                    name: sceneName,
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
        }
    });

    // Process a branch and its actions
    Macro.add('branch', {
        tags: ['action', 'extra', 'cut'],
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
            if (!currentScene.branch || this.args[1] === 'start') {
                currentScene.branch = branchName;
                isCurrent = true;
            }

            // Parse branch contents
            currentScene.branches[branchName] = this.payload.map(part => {
                let retVal, link, arg1, arg2, arg3, filter, macro, contents;
                switch (part.name) {
                    case 'branch':
                        // Get the contents of the branch, the text to be rendered
                        retVal = String(part.contents).trim();
                        break;

                    case 'cut':
                        // Get the first arg to the cut, the passage name to cut away to
                        arg1 = String(part.args[0]).trim();

                        // Get the second (optional) arg to the cut, a macro OR a filter condition
                        if (part.args.length > 1) {
                            arg2 = part.args[1];
                            if ((arg2.includes('<<') && arg2.includes('>>'))) {
                                macro = arg2;
                                // Get the third (optional) arg to the cut, a filter condition
                                if (part.args.length > 2) filter = part.args[2];
                            } else {
                                filter = arg2;
                            }
                        }

                        // Get the contents of the cut (link text)
                        contents = String(part.contents).trim();

                        // Create the link
                        link = `<<link "${contents}" "${arg1}">>${macro}<<run setup.markCurrentSceneComplete()>><</link>>`;

                        // If there's a filter condition, wrap the link with it
                        if (filter) {
                            retVal = filterWrap(link, filter);
                        } else {
                            retVal = link;
                        }
                        break;

                    case 'action':
                        // Get the first arg to the action, a branch name OR a macro to execute
                        arg1 = String(part.args[0]).trim();

                        // If the argument isn't a macro, treat it as a branch name
                        if (!(arg1.includes('<<') && arg1.includes('>>'))) {
                            arg1 = `<<set $currentScene.branch to "${arg1}">><<run setup.sceneBranchTaken("${currentScene.name}","${arg1}")>><<run setup.renderCurrentBranch()>>`;
                        }

                        // Get the second arg to the action, the optional filter condition
                        arg2 = part.args[1];

                        // Get the contents of the action (link text)
                        contents = String(part.contents).trim();

                        // Create the link
                        link = `<<link "${contents}">>${arg1}<</link>>`;

                        // If there's a filter condition, wrap the link with it
                        if (arg2) {
                            retVal = filterWrap(link, arg2);
                        } else {
                            retVal = link;
                        }
                        break;

                    case 'extra':
                        // Get the first arg to the extra, the branch name
                        arg1 = String(part.args[0]).trim();
                        arg1 = `<<set $currentScene.branch to "${arg1}">><<run setup.sceneBranchTaken("${currentScene.name}","${arg1}")>><<run setup.renderCurrentBranch()>>`;

                        // Get the second arg to the extra, the macro
                        arg2 = String(part.args[1]).trim();

                        // Get the third arg to the extra, the filter condition
                        arg3 = String(part.args[2]).trim();

                        // Get the contents of the action (link text)
                        contents = String(part.contents).trim();

                        // Create the link
                        link = `<<link "${contents}">>${arg2}${arg1}<</link>>`;

                        // If there's a filter condition, wrap the link with it
                        if (arg3) {
                            retVal = filterWrap(link, arg3);
                        } else {
                            retVal = link;
                        }
                        break;
                }
                return retVal;
            });

            // Render branch if current
            if (isCurrent) {
                setup.renderCurrentBranch();
            }

            // Wrap a link with a filter condition to be executed at render time
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