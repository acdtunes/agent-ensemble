Feature: Types and Parser for Feature Description
  As the NW Teams board data layer
  I want to extract and carry description fields from roadmap configuration
  So the board can display feature descriptions to developers

  # =================================================================
  # US-01: Short description on feature cards
  # Data flow: roadmap.yaml -> parser -> RoadmapMeta -> FeatureSummary
  # =================================================================

  @us-01
  Scenario: RoadmapMeta type includes short_description field
    Given a roadmap.yaml with short_description "Brief feature summary"
    When the parser extracts roadmap metadata
    Then RoadmapMeta contains short_description "Brief feature summary"

  @us-01
  Scenario: RoadmapMeta type includes description field
    Given a roadmap.yaml with description "Detailed feature description for the board header"
    When the parser extracts roadmap metadata
    Then RoadmapMeta contains description "Detailed feature description for the board header"

  @us-01
  Scenario: Parser handles both descriptions together
    Given a roadmap.yaml with:
      | field             | value                                |
      | short_description | Brief summary                        |
      | description       | Detailed explanation of the feature  |
    When the parser extracts roadmap metadata
    Then RoadmapMeta contains short_description "Brief summary"
    And RoadmapMeta contains description "Detailed explanation of the feature"

  # =================================================================
  # US-03: Backward compatibility
  # =================================================================

  @us-03
  Scenario: Parser handles roadmap without descriptions
    Given a roadmap.yaml without description fields
    When the parser extracts roadmap metadata
    Then RoadmapMeta has undefined short_description
    And RoadmapMeta has undefined description

  @us-03
  Scenario: Parser handles roadmap with only short_description
    Given a roadmap.yaml with short_description "Brief summary" only
    When the parser extracts roadmap metadata
    Then RoadmapMeta contains short_description "Brief summary"
    And RoadmapMeta has undefined description

  @us-03
  Scenario: Parser handles roadmap with only description
    Given a roadmap.yaml with description "Detailed explanation" only
    When the parser extracts roadmap metadata
    Then RoadmapMeta has undefined short_description
    And RoadmapMeta contains description "Detailed explanation"

  # =================================================================
  # FeatureSummary derivation
  # =================================================================

  @us-01
  Scenario: FeatureSummary carries short_description from RoadmapMeta
    Given RoadmapMeta has short_description "Brief summary"
    When deriveFeatureSummary is called
    Then FeatureSummary has shortDescription "Brief summary"

  @us-01
  Scenario: FeatureSummary carries description from RoadmapMeta
    Given RoadmapMeta has description "Detailed explanation"
    When deriveFeatureSummary is called
    Then FeatureSummary has description "Detailed explanation"

  @us-03
  Scenario: FeatureSummary handles missing descriptions gracefully
    Given RoadmapMeta has no description fields
    When deriveFeatureSummary is called
    Then FeatureSummary has undefined shortDescription
    And FeatureSummary has undefined description
