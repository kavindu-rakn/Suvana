import { translationOf } from './translations'

export const SENTENCE_EXPERIMENTAL_LABEL = 'Experimental: whole-sentence match, not calibrated'

export interface SentenceReference {
  refId: string
  file: string
  datasetLabel: string
  gloss: string
  meaning?: string
}

// K-07 converter metadata copied verbatim. Array order is file order, not SSL order.
const DATASET_SENTENCES = [
  {
    "refId": "ref-4a60d99b-f3a0-5cd7-8618-b3d1571edaaf",
    "file": "kaggle_sent_50_KM_IDIRIYATA_YANNA.json",
    "datasetLabel": "50 KM idiriyata yanna",
    "gloss": "50 KM IDIRIYATA YANNA"
  },
  {
    "refId": "ref-abaee904-7a29-5b26-a8ec-407c22741f76",
    "file": "kaggle_sent_BARA_KILOGRAM_1_K.json",
    "datasetLabel": "bara kilogram 1 k ",
    "gloss": "BARA KILOGRAM 1 K "
  },
  {
    "refId": "ref-c439d486-2a9a-523b-96cc-3e4210315ec1",
    "file": "kaggle_sent_BEHETH_KIIYADA.json",
    "datasetLabel": "beheth kiiyada",
    "gloss": "BEHETH KIIYADA"
  },
  {
    "refId": "ref-78945fa0-09bd-5e77-a6f0-a39db93385bd",
    "file": "kaggle_sent_MAGE_BAGE_EKE_HOYANNA_UDAW_KARANNA.json",
    "datasetLabel": "mage bage eke hoyanna udaw karanna",
    "gloss": "MAGE BAGE EKE HOYANNA UDAW KARANNA"
  },
  {
    "refId": "ref-2961e4f7-7b2a-52c6-9385-cf0b2878cd12",
    "file": "kaggle_sent_MAGE_LAP_EKA_HOYANNA_UDAW_KARANNA.json",
    "datasetLabel": "mage lap eka hoyanna udaw karanna ",
    "gloss": "MAGE LAP EKA HOYANNA UDAW KARANNA "
  },
  {
    "refId": "ref-7cfc5e22-304d-5816-bacd-309f34062dcd",
    "file": "kaggle_sent_MAGE_NAMA.json",
    "datasetLabel": "Mage nama",
    "gloss": "MAGE NAMA"
  },
  {
    "refId": "ref-f7868e74-fc2c-5db2-bcef-7533f2d73422",
    "file": "kaggle_sent_MAGE_NAMA_DAHAM.json",
    "datasetLabel": "Mage nama Daham",
    "gloss": "MAGE NAMA DAHAM"
  },
  {
    "refId": "ref-3ddf01a9-20b4-5a69-82d0-6d51a621a341",
    "file": "kaggle_sent_MAGE_PHONE_EKA_HOYANNA_UDAW_KARANNA.json",
    "datasetLabel": "mage phone eka hoyanna udaw karanna",
    "gloss": "MAGE PHONE EKA HOYANNA UDAW KARANNA"
  },
  {
    "refId": "ref-63a3f280-8739-5468-a5e2-418bbf85aaf7",
    "file": "kaggle_sent_MAMA_OYATA_USAAVIYEDI_NADU_PAWARANAWA.json",
    "datasetLabel": "mama oyata usaaviyedi nadu pawaranawa",
    "gloss": "MAMA OYATA USAAVIYEDI NADU PAWARANAWA"
  },
  {
    "refId": "ref-89a76c83-8af0-58f1-be11-a37e2f1ac248",
    "file": "kaggle_sent_MATA_ASANIIPAI.json",
    "datasetLabel": "mata asaniipai",
    "gloss": "MATA ASANIIPAI"
  },
  {
    "refId": "ref-c607ffc7-b212-58fa-b182-bb165dc290dd",
    "file": "kaggle_sent_MATA_BEHETH_DENNA.json",
    "datasetLabel": "mata beheth denna",
    "gloss": "MATA BEHETH DENNA"
  },
  {
    "refId": "ref-39e4ae14-5a98-5a03-b0cb-1d0cf40f03cd",
    "file": "kaggle_sent_MATA_PANNANNE_BADUWK_PENNADDI_KIYANNE.json",
    "datasetLabel": "mata pannanne(baduwk pennaddi kiyanne)",
    "gloss": "MATA PANNANNE(BADUWK PENNADDI KIYANNE)"
  },
  {
    "refId": "ref-f5776a0b-bf27-5e0b-8915-c8e5fef75312",
    "file": "kaggle_sent_NURSE_MATA_BEHETH_DENNA.json",
    "datasetLabel": "nurse mata beheth denna",
    "gloss": "NURSE MATA BEHETH DENNA"
  },
  {
    "refId": "ref-234b4e6c-13f6-57c2-afc6-3842da1eeb7c",
    "file": "kaggle_sent_NURSE_MATA_BEHETH_ENNATH_KARANAWA.json",
    "datasetLabel": "nurse mata beheth ennath karanawa",
    "gloss": "NURSE MATA BEHETH ENNATH KARANAWA"
  },
  {
    "refId": "ref-dd8a74a3-bf0f-595b-84e1-0a3cebffb985",
    "file": "kaggle_sent_OYAAGE_UPANDINAYA_KAWADDA.json",
    "datasetLabel": "oyaage upandinaya kawadda",
    "gloss": "OYAAGE UPANDINAYA KAWADDA"
  },
  {
    "refId": "ref-494e7235-24ab-50df-927e-39146adf14f9",
    "file": "kaggle_sent_PAARA_DIGE_KELIN_GIHILLA_WAMATA_HARENNE.json",
    "datasetLabel": "paara dige kelin gihilla wamata harenne",
    "gloss": "PAARA DIGE KELIN GIHILLA WAMATA HARENNE"
  },
  {
    "refId": "ref-b5c6d28b-b2e2-57e0-af0d-f749c6e92a07",
    "file": "kaggle_sent_PARIMAAWA_LITER_1_K.json",
    "datasetLabel": "parimaawa liter 1 k",
    "gloss": "PARIMAAWA LITER 1 K"
  },
  {
    "refId": "ref-17e27b1c-b88f-50f9-975a-85a5e71bdb90",
    "file": "kaggle_sent_THEL_LITER_1_K.json",
    "datasetLabel": "thel liter 1 k",
    "gloss": "THEL LITER 1 K"
  },
  {
    "refId": "ref-bd49933a-c822-575c-9953-173dabb27690",
    "file": "kaggle_sent_T_SHIRT_EKE_MILA_KIIYADA.json",
    "datasetLabel": "T shirt eke mila kiiyada",
    "gloss": "T SHIRT EKE MILA KIIYADA"
  }
] as const

export const SENTENCES: readonly SentenceReference[] = DATASET_SENTENCES.map(row => {
  const meaning = translationOf(row.gloss)
  return meaning ? { ...row, meaning } : { ...row }
})

const sentenceIds = new Set<string>(SENTENCES.map(row => row.refId))
export const SENTENCE_BY_REF_ID: ReadonlyMap<string, SentenceReference> = new Map(SENTENCES.map(row => [row.refId, row]))
const sentenceGlosses = new Set<string>(SENTENCES.map(row => row.gloss))

/** Also catches locally imported copies and future sentence-category files. */
export function isSentenceReference(rec: { id?: string; file?: string; sourceCategory?: string }): boolean {
  return rec.sourceCategory === 'SSL Sentences' || rec.file?.startsWith('kaggle_sent_') === true
    || (rec.id !== undefined && (rec.id.startsWith('kaggle_sent_') || sentenceIds.has(rec.id)))
}

/** For older saved recommendation metadata that carries only the gloss. */
export function isSentenceGloss(gloss: string): boolean { return sentenceGlosses.has(gloss) }
