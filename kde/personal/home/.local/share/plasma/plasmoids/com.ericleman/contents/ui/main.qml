import QtQuick 2.1
import QtQuick.Layouts 1.0
import org.kde.plasma.plasmoid 2.0
import org.kde.plasma.core 2.0 as PlasmaCore
import org.kde.plasma.components 2.0 as PlasmaComponent

Item {
	id: widget

	PlasmaCore.DataSource {
		id: executable
		engine: "executable"
		connectedSources: []
		onNewData: {
			var exitCode = data["exit code"]
			var exitStatus = data["exit status"]
			var stdout = data["stdout"]
			var stderr = data["stderr"]
			exited(sourceName, exitCode, exitStatus, stdout, stderr)
			disconnectSource(sourceName) // cmd finished
		}
		function exec(cmd) {
			if (cmd) {
				connectSource(cmd)
			}
		}
		signal exited(string cmd, int exitCode, int exitStatus, string stdout, string stderr)
	}

	Item {
		id: config
		//readonly property bool active: !!command
		readonly property int interval: 600000
		readonly property string command: 'yay -Sy &> /dev/null && (n_up=$(yay -Qu | wc -l);(([ "$n_up" -eq 0 ] && echo "  ") || echo "  $n_up ")) || echo " yay N/A "'
		readonly property string clickCommand: 'kitty yay'
		readonly property color textColor: theme.textColor
		readonly property color outlineColor: theme.backgroundColor
		readonly property bool showOutline: false
	}

	property string outputText: ''
	Connections {
		target: executable
		onExited: {
			if (cmd == config.command) {
				var formattedText = stdout

				// Newlines
				if (formattedText.length >= 1 && formattedText[formattedText.length-1] == '\n') {
					formattedText = formattedText.substr(0, formattedText.length-1)
				}

				widget.outputText = formattedText
				timer.restart()
			} else if (cmd == config.clickCommand) {
				executable.exec(config.command)
			}
		}
	}

	function runCommand() {
		// console.log('[commandoutput]', Date.now(), 'runCommand', config.command)
		executable.exec(config.command)
	}

	function performClick() {
		executable.exec(config.clickCommand)
	}

	Timer {
		id: timer
		interval: config.interval
		running: true
		repeat: false
		onTriggered: widget.runCommand()

		Component.onCompleted: {
			// Run right away in case the interval is very long.
			triggered()
		}
	}

	Plasmoid.onActivated: widget.performClick()

	Plasmoid.backgroundHints: PlasmaCore.Types.DefaultBackground

	Plasmoid.preferredRepresentation: Plasmoid.fullRepresentation
	Plasmoid.fullRepresentation: Item {
		id: panelItem

		readonly property bool isHorizontal: plasmoid.formFactor == PlasmaCore.Types.Horizontal
		readonly property bool isVertical: plasmoid.formFactor == PlasmaCore.Types.Vertical
		readonly property bool isInPanel: isHorizontal || isVertical
		readonly property bool isOnDesktop: !isInPanel
		readonly property int itemWidth: Math.ceil(output.implicitWidth)

		Layout.minimumWidth: isHorizontal ? itemWidth : -1
		Layout.fillWidth: isVertical
		Layout.preferredWidth: itemWidth // Panel widget default

		readonly property int itemHeight: Math.ceil(output.implicitHeight)
		Layout.minimumHeight: isVertical ? itemHeight : -1
		Layout.fillHeight: isHorizontal
		Layout.preferredHeight: itemHeight // Panel widget default

		// Note MouseArea is below the Text so
		// that we don't eat the link clicks.
		MouseArea {
			id: mouseArea
			anchors.fill: parent
			hoverEnabled: true
			cursorShape: output.hoveredLink ? Qt.PointingHandCursor : Qt.ArrowCursor

			onClicked: {
				widget.performClick()
			}
		}

		PlasmaCore.ToolTipArea {
			anchors.fill: parent
			subText: output.text
			enabled: output.truncated
		}

		Text {
			id: output
			width: parent.width
			height: parent.height

			text: widget.outputText

			color: config.textColor
			style: config.showOutline ? Text.Outline : Text.Normal
			styleColor: config.outlineColor

			linkColor: theme.linkColor
			onLinkActivated: Qt.openUrlExternally(link)

			font.pointSize: -1
			font.pixelSize: 16 * units.devicePixelRatio
			font.family: theme.defaultFont.family
			font.weight: Font.Normal
			font.italic: false
			font.underline: false
			fontSizeMode: Text.FixedSize
			horizontalAlignment: Text.AlignLeft
			verticalAlignment: Text.AlignVCenter
			elide: Text.ElideRight
			wrapMode: Text.NoWrap
		}

	}

}
