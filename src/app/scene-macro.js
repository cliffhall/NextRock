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

    Macro.add('scene', {
        tags: null,
        handler : function () {

            // Throw error if scene not named
            if (this.args.length < 1 || typeof this.args[0] !== 'string' || !this.args[0].trim()) {
                return this.error('You must name each scene');
            }

            // Set the current scene to this one, and reset the current branch
            State.setVar('$currentScene', this.args[0]);
            State.setVar('$currentBranch', null);

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

            // Name of branch
            let branchName;

            // Throw error if branch not named
            if (this.args.length < 1 || typeof this.args[0] !== 'string' || !this.args[0].trim()) {
                return this.error('You must name each branch');
            }

            // Set the current branch to this one
            if (!!State.getVar('$currentBranch') && this.args.length === 2 || this.args[1] === 'start') {
                State.setVar('$currentBranch', this.args[0]);
            }

            // Render branch if current
            if (State.getVar('$currentBranch') === this.args[0]) {

                // Branch actions
                let contents = this.payload.map(part => {
                    let retVal;
                    switch (part.name) {
                        case 'branch':
                            retVal = String(this.payload[0].contents).trim();
                            break;
                        case 'action':
                            retVal = `<<link "${String(part.contents).trim()}">><<set $currentBranch to "${part.args[0]}">><</link>>`;
                            console.log(retVal);
                            break;
                    }
                    return retVal;
                });

                let branch = contents.shift();
                let container = $(State.getVar('$sceneContainer'));
                container.wiki(branch);
                if (contents.length) {
                    let list = $(document.createElement('ul'));
                    contents.forEach(action => {
                        let bullet = $(document.createElement('li'));
                        bullet
                            .wiki(action)
                            .appendTo(list);
                    });
                    list.appendTo(container);
                }
            }
        }
    });

}());