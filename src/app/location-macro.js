/*
    NARRATIVE MACRO SET FOR TWINE/SUGARCUBE
    > LOCATION MACRO
    Copyright © 2019 Cliff Hall

    In a 'location' tagged passage:
    <<location>>
        Descriptive text of location, including macros, etc.
        .
        .
        .
    <</location>>

    RATIONALE
     * The description of a location can be suppressed while a scene is being displayed

    USAGE
     * Wrap the text of a 'location' tagged passage with the <<location>> macro
     * DO NOT include the <<nav>> macro within the <<location>> macro.
 */
(function () {
    'use strict';

    // Process a plot
    Macro.add('location', {
        tags: null,
        handler : function () {
            if (!State.getVar('$currentScene') && !State.getVar('$endingBranchShown')) {
                // Create location container and add it to the DOM
                let container = document.createElement('div');
                container.setAttribute('id', 'locationContainer');
                $(this.output).append(container);
                $(container).empty();
                $(container).wiki(String(this.payload[0].contents).trim());
            }
        }
    });

}());
