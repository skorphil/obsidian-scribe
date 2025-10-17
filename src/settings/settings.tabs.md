**GENERAL**
*Audio*
selectedAudioDeviceId: string;

*AI Processing*
isDisableLlmTranscription: boolean;
isOnlyTranscribeActive: boolean; // enable transcript analysis and synthesis

*Language*
scribeOutputLanguage: OutputLanguageOptions;
audioFileLanguage: LanguageOptions;

*Transcripts*
+ transcriptDirectory: string;
+ isFrontMatterLinkToScribe: boolean;
noteFilenamePrefix: string;
dateFilenameFormat: string;
isAppendToActiveFile: boolean;

*Recordings*
+ recordingDirectory: string;
recordingFilenamePrefix: string;
isSaveAudioFileActive: boolean;
audioFileFormat: 'webm' | 'mp3';


**AI PROVIDERS**
*Transcription*
transcriptPlatform: TRANSCRIPT_PLATFORM; OpenAI | OpenAi Compatible | Assembly
isMultiSpeakerEnabled: boolean;
customTranscriptModel: string;

assemblyAiApiKey: string;
+ OpenAI API key
+ Custom API key

*Synthesis*
llmModel: LLM_MODELS; OpenAI | Custom OpenAi Compatible | Gemini
openAiApiKey: string;

useCustomOpenAiBaseUrl: boolean;
customOpenAiBaseUrl: string;
customChatModel: string;

+ OpenAI API key
+ Custom API key
+ Gemini API key


**TEMPLATES**
activeNoteTemplate: ScribeTemplate;
noteTemplates: ScribeTemplate[];

