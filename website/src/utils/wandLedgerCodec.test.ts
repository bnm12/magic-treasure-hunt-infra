import { describe, expect, it } from "vitest";
import fixtures from "./test-fixtures/wand-ledger-codec.json";
import type { NfcRecord } from "../composables/nfcSession";
import {
  buildWandWritePlan,
  buildInitializationWritePlan,
  decodeWandRecords,
  estimateWandMessageBytes,
  normalizeNfcRecords,
  semanticallyEquivalentWandRecords,
  toNdefRecordInit,
  WandCodecError,
} from "./wandLedgerCodec";

type FixtureRecord = {
  recordType: string;
  mediaType?: string;
  id?: string;
  encoding?: string;
  lang?: string;
  data: number[];
};

function fixtureRecords(records: FixtureRecord[]): NfcRecord[] {
  return records.map((record) => ({
    ...record,
    data: new Uint8Array(record.data).buffer,
  }));
}

describe("wand ledger codec", () => {
  it("discovers exact owned records and merges duplicate years", () => {
    const input = fixtureRecords(fixtures.duplicateMerge.records);
    const result = decodeWandRecords(normalizeNfcRecords(input));

    expect(result.hunts).toEqual(fixtures.duplicateMerge.expectedHunts);
    expect(result.metadata).toMatchObject(fixtures.duplicateMerge.expectedMetadata);
    expect(result.metadataStatus).toBe("valid");
    expect(result.diagnostics).toEqual([]);
  });

  it("keeps aliases opaque and diagnoses malformed metadata", () => {
    const input = fixtureRecords(fixtures.opaqueAliasesAndMalformedMetadata.records);
    const result = decodeWandRecords(normalizeNfcRecords(input));

    expect(result.hunts).toEqual(fixtures.opaqueAliasesAndMalformedMetadata.expectedHunts);
    expect(result.metadataStatus).toBe("malformed");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      fixtures.opaqueAliasesAndMalformedMetadata.expectedDiagnosticCodes,
    );
  });

  it("recognizes and emits the website MIME representation", () => {
    const input = fixtureRecords(fixtures.websiteMime.records);
    const normalized = normalizeNfcRecords(input);
    const result = decodeWandRecords(normalized);

    expect(result.hunts).toEqual(fixtures.websiteMime.expectedHunts);
    expect(result.metadataStatus).toBe("valid");

    const plan = buildWandWritePlan(normalized, {
      kind: "spot",
      year: 2026,
      spotId: 3,
    });
    expect(plan.records[1]).toMatchObject({
      recordType: "mime",
      mediaType: "x-hunt:2026",
    });
    expect(plan.records[2]).toMatchObject({
      recordType: "mime",
      mediaType: "x-hunt-meta",
    });
  });

  it("leaves hunt records untouched for a Record 1 write", () => {
    const normalized = normalizeNfcRecords(
      fixtureRecords(fixtures.duplicateMerge.records),
    );
    const replacement = normalized[0]!;
    const plan = buildWandWritePlan(normalized, {
      kind: "record1",
      record: replacement,
    });

    expect(plan.records.slice(1)).toEqual(normalized.slice(1));
    expect(plan.diagnostics).toEqual([]);
    expect(plan.repairs).toEqual([]);
  });

  it("treats Record 1 as opaque even when its type resembles owned data", () => {
    const records = normalizeNfcRecords([
      {
        recordType: "x-hunt:2026",
        data: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]).buffer,
      },
      {
        recordType: "x-hunt-meta",
        data: new Uint8Array([7, 234, 3, 65, 100, 97]).buffer,
      },
    ]);

    expect(decodeWandRecords(records).hunts).toEqual({});
    expect(decodeWandRecords(records).metadataStatus).toBe("valid");
  });

  it("repairs an invalid exact hunt type while keeping a valid same-year record", () => {
    const input = fixtureRecords(fixtures.repairKeepsValidSameYear.records);
    const plan = buildWandWritePlan(normalizeNfcRecords(input), {
      kind: "spot",
      year: 2026,
      spotId: 2,
    });

    expect(plan.repairs[0]).toMatchObject(fixtures.repairKeepsValidSameYear.expectedRepair);
    expect(plan.records.map((record) => record.recordType)).toEqual(
      fixtures.repairKeepsValidSameYear.expectedHuntRecordTypes,
    );
    expect(plan.records[2]?.data).toEqual(
      new Uint8Array(fixtures.repairKeepsValidSameYear.expectedSpotPayload),
    );
  });

  it("appends a fresh year after repairing an invalid-only exact hunt type", () => {
    const input = fixtureRecords(fixtures.repairCreatesMissingYear.records);
    const plan = buildWandWritePlan(normalizeNfcRecords(input), {
      kind: "spot",
      year: 2026,
      spotId: 1,
    });

    expect(plan.records.map((record) => record.recordType)).toEqual(
      fixtures.repairCreatesMissingYear.expectedHuntRecordTypes,
    );
    expect(plan.records[3]?.data).toEqual(
      new Uint8Array(fixtures.repairCreatesMissingYear.expectedSpotPayload),
    );
  });

  it("does not append fresh records for invalid non-target years", () => {
    const input = fixtureRecords(fixtures.repairCreatesMissingYear.records);
    const plan = buildWandWritePlan(normalizeNfcRecords(input), {
      kind: "spot",
      year: 2025,
      spotId: 1,
    });

    expect(plan.records.map((record) => record.recordType)).toEqual([
      "url",
      "x-hunt-invalid:2026",
      "x-hunt-meta",
      "x-hunt:2025",
    ]);
  });

  it("blocks spot writes when metadata is missing or duplicated", () => {
    const missingMetadata = normalizeNfcRecords([
      { recordType: "url", data: new ArrayBuffer(0) },
    ]);
    expect(() =>
      buildWandWritePlan(missingMetadata, {
        kind: "spot",
        year: 2026,
        spotId: 1,
      }),
    ).toThrowError(WandCodecError);

    const duplicateMetadata = fixtureRecords([
      { recordType: "url", data: [] },
      { recordType: "x-hunt-meta", data: [7, 234, 3, 65, 100, 97] },
      { recordType: "x-hunt-meta", data: [7, 234, 3, 65, 100, 97] },
    ]);
    expect(() =>
      buildWandWritePlan(normalizeNfcRecords(duplicateMetadata), {
        kind: "spot",
        year: 2026,
        spotId: 1,
      }),
    ).toThrowError(WandCodecError);
  });

  it("rejects invalid spot IDs and preflights capacity before output", () => {
    const input = fixtureRecords(fixtures.duplicateMerge.records);
    expect(() =>
      buildWandWritePlan(normalizeNfcRecords(input), {
        kind: "spot",
        year: 2026,
        spotId: 65,
      }),
    ).toThrowError(WandCodecError);

    const normalized = normalizeNfcRecords(input);
    const size = estimateWandMessageBytes(
      buildWandWritePlan(normalized, {
        kind: "record1",
        record: normalized[0]!,
      }).records,
    );
    expect(() =>
      buildWandWritePlan(normalized, { kind: "record1", record: normalized[0]! }, {
        capacityBytes: size - 1,
      }),
    ).toThrowError(WandCodecError);
  });

  it("enforces fatal UTF-8 and the 127-byte metadata name limit", () => {
    const overlongName = fixtureRecords(fixtures.metadataValidation.overlongName.records);
    const invalidUtf8 = fixtureRecords(fixtures.metadataValidation.invalidUtf8.records);

    expect(decodeWandRecords(normalizeNfcRecords(overlongName)).metadataStatus)
      .toBe("malformed");
    expect(decodeWandRecords(normalizeNfcRecords(invalidUtf8)).metadataStatus)
      .toBe("malformed");
  });

  it("initializes metadata as a website MIME record", () => {
    const plan = buildInitializationWritePlan(
      normalizeNfcRecords([{ recordType: "url", data: new ArrayBuffer(0) }])[0]!,
      "Ada",
      2026,
    );

    expect(plan.records[1]).toMatchObject({
      recordType: "mime",
      mediaType: "x-hunt-meta",
    });
  });

  it("preserves normalized fields and nested records through Web NFC conversion", () => {
    const normalized = normalizeNfcRecords([
      {
        recordType: "unknown",
        mediaType: "application/example",
        id: "nested",
        encoding: "utf-8",
        lang: "en",
        data: new Uint8Array([1, 2]).buffer,
        records: [
          {
            recordType: "text",
            lang: "en",
            data: new Uint8Array([3, 4]).buffer,
          },
        ],
      },
    ]);
    const output = toNdefRecordInit(normalized[0]!);

    expect(output).toMatchObject({
      recordType: "unknown",
      mediaType: "application/example",
      id: "nested",
      encoding: "utf-8",
      lang: "en",
    });
    expect(output.data).toMatchObject({
      records: [{ recordType: "text", lang: "en" }],
    });
  });

  it("compares canonical normalized semantics rather than duplicate serialization", () => {
    const first = normalizeNfcRecords(
      fixtureRecords(fixtures.duplicateMerge.records),
    );
    const second = [
      first[0]!,
      first[1]!,
      {
        ...first[2]!,
        data: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 7]),
      },
      first[4]!,
      first[5]!,
    ];

    expect(semanticallyEquivalentWandRecords(first, second)).toBe(true);
    const canonical = buildWandWritePlan(first, {
      kind: "record1",
      record: first[0]!,
    }).records;
    expect(semanticallyEquivalentWandRecords(canonical, canonical)).toBe(true);
  });
});
