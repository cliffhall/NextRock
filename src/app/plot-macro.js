/*
    NARRATIVE MACRO SET FOR TWINE/SUGARCUBE
    > PLOT & NARRATOR MACROS
    Copyright © 2019 Cliff Hall

    In the StoryInit special passage:
    <<plot>>
        <<point scenePassage ['selectCondition'] ['discardCondition']>>
        .
        .
        .
    <</plot>>

    At the bottom of the PassageHeader special passage:
    <<narrator>><</narrator>>

    RATIONALE
     * A story may consist of several plots, each with it's own plot points.
     * Create one or more lists of plot points to step through as the player navigates.
     * A narrator decides which plot point's scene (if any) to select before each passage is rendered.
     * Each time a 'location' tagged passage is navigated to, the next point in each plot is evaluated.
     * If the selectCondition for a plot point evaluates to true, it is selected.
     * If the plot point being evaluated contains no selectCondition, it is selected and evaluation halts.
     * If a discardCondition is included and returns true, the narrator will move on to the next plot point for evaluation.
     * When a plot point is selected, its associated scenePassage is included at the spot where the narrator macro is placed.
     * Once a plot point has been selected, it will not be selected again.
     * If there are multiple plots, the next point in each is evaluated in the order the plots were created.
     * When a plot point is selected, remaining plots will not be evaluated until the next location tagged passage is visited.

    USAGE
     * Plots should be defined in the special StoryInit passage, in the order you wish them evaluated.
     * Point tags must contain a scenePassage argument (in quotes if more than one word) which exists.
     * A plot point's scenePassage is usually a 'scene' tagged passage containing a scene macro, though it is not a requirement.

 */
(function () {
    'use strict';

    // Process a plot
    Macro.add('plot', {
        tags: ['point'],
        handler : function () {

            // Get the plots array from State or create it
            let plot={next:0}, plots = [];
            if (Array.isArray(State.getVar('$plots'))) {
                plots = State.getVar('$plots');
            } else {
                State.setVar('$plots', plots);
            }

            // Process the plot points
            plot.points = this.payload.splice(1).map((part) => {
                let include, scenePassage, selectCondition, discardCondition, point = {};
                if (part.name === 'point') {

                    // Get the scene passage
                    scenePassage = String(part.args[0]).trim();

                    // Create the include
                    include = `<<include "${scenePassage}">>`;

                    // Get select condition
                    selectCondition = part.args[1];

                    // Get discard condition
                    discardCondition = part.args[2];

                    // Build the point object
                    point.include = include;
                    if (selectCondition && !discardCondition) {
                        point.condition = `<<if ${selectCondition}>><<set $selectPoint to true>><</if>>`;
                    } else if (selectCondition && discardCondition) {
                        point.condition = `<<if ${selectCondition}>><<set $selectPoint to true>><<elseif ${discardCondition}>><<set $discardPoint to true>><<set $selectPoint to false>><</if>>`;
                    } else if (!selectCondition && discardCondition) {
                        point.condition = `<<if ${discardCondition}>><<set $discardPoint to true>><<set $selectPoint to false>><</if>>`;
                    }

                    console.log(point.condition);

                }
                return point;
            });

            // Add the plot to the list of plots
            plots.push(plot);
            State.setVar('$plots', plots);
        }
    });

    // Evaluate next plot points for potential selection
    Macro.add('narrator',{
        tags: null,
        handler : function () {
            // Bail if there is a current scene
            if (!!(State.getVar('$currentScene'))) return;

            // Clear the select point flag
            State.setVar('$selectPoint', false);
            State.setVar('$discardPoint', false);

            // Get the plots array from State or create it
            let plots = State.getVar('$plots');
            if (plots){
                let plot, plotNum = 0;
                do {
                    plot = plots[plotNum];
                    if (plot.next === plot.points.length) {plotNum++; continue;}
                    let point = plot.points[plot.next];
                    if (!point.condition){
                        plot.next++;
                        $(this.output).wiki(point.include);
                        break;
                    } else {
                        $.wiki(point.condition);
                        let shouldSelect = State.getVar('$selectPoint');
                        let shouldDiscard = State.getVar('$discardPoint');
                        if (shouldSelect){
                            State.setVar('$selectPoint', false);
                            plot.next++;
                            $(this.output).wiki(point.include);
                            break;
                        } else if (shouldDiscard) {
                            plot.next++;
                        }
                    }
                    plotNum++;
                } while (!!plots[plotNum]);
            }
        }
    });

}());
