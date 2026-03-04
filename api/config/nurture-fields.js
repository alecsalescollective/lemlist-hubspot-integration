/**
 * Salesforce field API names and constants for the Closed Lost - Nurture automation.
 *
 * After running the discovery endpoint (GET /api/salesforce/discover-fields?object=Opportunity),
 * update these field names to match your org's actual API names.
 */

module.exports = {
  // Opportunity stage that triggers processing
  STAGE_NAME: 'Closed Lost - Nurture',

  // Opportunity fields containing deal notes for AI analysis
  // These are the API names — update after running the discovery endpoint
  opportunityFields: {
    theGap: 'The_GAP__c',
    ourAnalysis: 'Our_Analysis__c',
    rootCauses: 'Root_Causes__c',
    revenueProblems: 'Revenue_Problems_Desired_Outcomes__c',
    businessImpact: 'Business_Impact__c',
    foundationalFacts: 'Foundational_Facts_Context__c',
    winLossDetails: 'Win_Loss_Details__c',
  },

  // Contact fields to update with AI analysis results
  contactFields: {
    nurtureHypothesis: 'Nurture_Problem_Hypothesis__c',
    nurtureContext: 'Nurture_Context__c',
  },

  // Valid picklist values for the Nurture Problem - Hypothesis field
  hypothesisValues: [
    'Competency-based Training',
    'Hiring',
    'Process',
    'Leadership',
    'Unknown',
    'Newsletter Only',
  ],
};
