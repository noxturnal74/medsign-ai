const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'CameraFeed.jsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Target segment with the premature closing </div> of the glass-panel
const targetSegment = `          {isActive && (
            <div className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1 text-right text-[10px] font-bold text-sky-200 backdrop-blur-xl">
              {fps} FPS - MediaPipe
            </div>
          )}
        </div>
      </div>

      {!isActive && (`;

const normalizedTargetSegment = targetSegment.replace(/\r\n/g, '\n');
if (!content.includes(normalizedTargetSegment)) {
  console.error("targetSegment not found!");
  process.exit(1);
}

const replacementSegment = `          {isActive && (
            <div className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1 text-right text-[10px] font-bold text-sky-200 backdrop-blur-xl">
              {fps} FPS - MediaPipe
            </div>
          )}
        </div>

      {!isActive && (`;

let newContent = content.replace(normalizedTargetSegment, replacementSegment);

// 2. Locate where to append the closing </div> (end of overlays, right before the isActive button bar)
const closingTarget = `            )}
          </>
        )}
      </div>

      {isActive && (`;

const closingReplacement = `            )}
          </>
        )}
      </div>
      </div>

      {isActive && (`;

const normalizedClosingTarget = closingTarget.replace(/\r\n/g, '\n');
if (!newContent.includes(normalizedClosingTarget)) {
  console.error("closingTarget not found!");
  process.exit(1);
}

newContent = newContent.replace(normalizedClosingTarget, closingReplacement);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Successfully fixed CameraFeed.jsx overlay scoping!");
