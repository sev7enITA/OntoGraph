<?php
declare(strict_types=1);

function studioJourneyCase(string $workspace): ?string {
    $cases = ['personal-library', 'department-wbs', 'copilot-glossary', 'policy-change'];
    foreach ($cases as $case) {
        if ($workspace === 'journey-' . $case) return $case;
    }
    return null;
}

function studioJourneyLoginResponse(string $html, mixed $case, mixed $locale): string {
    if (!is_string($case)) return $html;
    $case = studioJourneyCase('journey-' . $case);
    if ($case === null) return $html;
    $lang = $locale === 'zh-Hans' ? 'zh-Hans' : 'en';
    $target = '/OntoGraph/decisions/?lang=' . $lang . '&workspace=journey-' . $case;
    $default = "window.location.assign(DGLocale.path(base + '/'));";
    if (substr_count($html, $default) !== 1) return $html;
    return str_replace($default, 'window.location.assign(' . json_encode($target, JSON_HEX_TAG | JSON_THROW_ON_ERROR) . ');', $html);
}
