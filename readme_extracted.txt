=== README CONTENT ===
Sign Language Translator ⠎⠇⠞
Build Custom Translators and Translate between Sign Language & Text with AI.
Support Us
❤️
Overview
Solution
Major Components
Goals
Installation
🛠️
Usage
Web 🌐
Python
🐍
Command Line
>_
Languages
Models
How to Build a Translator for your Sign Language
Module Hierarchy
How to Contribute
Citation, License & Research Papers
Credits and Gratitude
Overview
Sign language consists of gestures and expressions used mainly by the hearing-impaired to talk. This project is an effort to bridge the communication gap between the hearing and the hearing-impaired community using Artificial Intelligence.
This python library provides a user-friendly translation API and a framework for building sign language translators that can easily adapt to any regional sign language...
A big hurdle is the lack of datasets (global & regional) and frameworks that deep learning engineers and software developers can use to build useful products for the target community. This project aims to empower sign language translation by providing robust components, tools, datasets and models for both sign language to text and text to sign language conversion. It aims to facilitate the creation of sign language translators for any region, while building the way towards sign language standardization.
Unlike most other projects, this python library can translate full sentences and not just the alphabet.
Solution
This package comes with an
extensible rule-based
text-to-sign translation system that can be used to generate training data for
Deep Learning
models for both sign to text & text to sign translation.
Tip
To create a rule-based translation system for your regional language, you can inherit the TextLanguage and SignLanguage classes and pass them as arguments to the ConcatenativeSynthesis class. To write sample texts of supported words, you can use our language models. Then, you can use that system to fine-tune our deep learning models.
See the
documentation
and our
datasets
for details.
Major Components
Sign language to Text
Extract features from sign language videos
See the
slt.models.video_embedding
sub-package and the
$ slt embed
command.
Currently Mediapipe 3D landmarks are being used for deep learning.
Transcribe and translate signs into multiple text languages to generalize the model.
To train for word-for-word gloss writing task, also use a synthetic dataset made by concatenating signs for each word in a text. (See
slt.models.ConcatenativeSynthesis
)
Fine-tune a neural network, such as one from
slt.models.sign_to_text
or the encoder of any multilingual seq2seq model, on your dataset.
Text to Sign Language
There are two approaches to this problem:
Rule Based Concatenation
Label a Sign Language Dictionary with all word tokens that can be mapped to those signs. See our mapping format
here
.
Parse the input text and play appropriate video clips for each token.
Build a text processor by inheriting
slt.languages.TextLanguage
(see
slt.languages.text
sub-package for details)
Map the text grammar & words to sign language by inheriting
slt.languages.SignLanguage
(see
slt.languages.sign
sub-package for details)
Use our rule-based model
slt.models.ConcatenativeSynthesis
for translation.
It is faster but the
word sense has to be disambiguated
in the input. See the deep learning approach to automatically handle ambiguous words &
words not in dictionary
.
Deep learning (seq2seq)
Either generate the sequence of filenames that should be concatenated
you will need a
parallel corpus
of normal text sentences against sign language gloss (sign sequence written word-for-word)
Or synthesize the signs directly by using a pre-trained multilingual text encoder and
a GAN or diffusion model or decoder to synthesize a sequence of pose vectors (
shape = (time, num_landmarks * num_coordinates)
)
Move an Avatar with those pose vectors (Easy)
Use motion transfer to generate a video (Medium)
Synthesize a video frame for each vector (Difficult)
a video synthesis model (Very Difficult)
Language Processing
Sign Processing
3D world landmarks extraction with Mediapipe.
Pose Visualization with matplotlib.
Pose transformations (data augmentation) with scipy.
Text Processing
Normalize text input by substituting unknown characters/spellings with supported words.
Disambiguate context-dependent words to ensure accurate translation.
"spring" -> ["spring(water-spring)", "spring(metal-coil)"]
Tokenize text (word & sentence level).
Classify tokens and mark them with Tags.
Datasets
For our datasets & conventions, see the
sign-language-datasets
repo
and its
releases
.
See this
documentation
for more on building a dataset of Sign Language videos (or motion capture gloves' output features).
Your data should include
:
A word level Dictionary (Videos of individual signs & corresponding Text tokens (words & phrases))
Replications of the dictionary. (Set up multiple syncronized cameras and record random people performing the dictionary videos. (
notebook
))
Parallel sentences
Normal text language sentences against sign language videos. (Use our Language Models to generate sentences composed of dictionary words.)
Normal text language sentences against the
text gloss
of the corresponding sign language sentence.
Sign language sentences against their text gloss
Sign language sentences against translations in multiple text languages
Grammatical rules of the sign language
Word order (e.g. SUBJECT OBJECT VERB TIME)
Meaningless words (e.g. "the", "am", "are")
Ambiguous words (e.g. spring(coil) & spring(water-fountain))
Try to incorporate
:
Multiple camera angles
Diverse performers to capture all
accents
of the signs
Uniqueness in labeling of word tokens
Variations in signs for the same concept
Try to capture variations in signs in a scalable and diversity accommodating way and enable advancing sign language standardization efforts.
Goals
Enable
integration
of sign language into existing applications.
Assist construction of
custom
solutions for resource poor sign langauges.
Improve
education
quality for the deaf and elevate literacy rates.
Promote communication
inclusivity
of the hearing impaired.
Establish a framework for sign language
standardization
.
How to install the package
pip install sign-language-translator
Editable mode (
git clone
):
The package ships with some optional dependencies as well (e.g. deep_translator for synonym finding and mediapipe for a pretrained pose extraction model). Install them by appending
[all]
,
[full]
,
[mediapipe]
or
[synonyms]
to the project name in the command (e.g
pip install sign-langauge-translator[full]
).
git clone https://github.com/sign-language-translator/sign-language-translator.git
cd
sign-language-translator
pip install -e
"
.[all]
"
pip install -e git+https://github.com/sign-language-translator/sign-language-translator.git#egg=sign_language_translator
Usage
Head over to
slt.
readthedocs
.io
to see the detailed usage in Python, CLI and gradio GUI.
See the
test cases
or the
notebooks
repo
to see the internal code in action.
Web GUI
Individual models deployed on HuggingFace Spaces:
Python
import
sign_language_translator
as
slt
# The core model of the project (rule-based text-to-sign translator)
# which enables us to generate synthetic training datasets
model
=
slt
.
models
.
ConcatenativeSynthesis
(
text_language
=
"urdu"
,
sign_language
=
"pk-sl"
,
sign_format
=
"video"
)
text
=
"یہ بہت اچھا ہے۔"
# "this-very-good-is"
sign
=
model
.
translate
(
text
)
# tokenize, map, download & concatenate
sign
.
show
()
model
.
sign_format
=
slt
.
SignFormatCodes
.
LANDMARKS
model
.
sign_embedding_model
=
"mediapipe-world"
# ==== English ==== #
model
.
text_language
=
slt
.
languages
.
text
.
English
()
sign_2
=
model
.
translate
(
"This is an apple."
)
sign_2
.
save
(
"this-is-an-apple.csv"
,
overwrite
=
True
)
# ==== Hindi ==== #
model
.
text_language
=
slt
.
TextLanguageCodes
.
HINDI
sign_3
=
model
.
translate
(
"कैसे हैं आप?"
)
# "how-are-you"
sign_3
.
save_animation
(
"how-are-you.gi