#include "UI/MCMainMenuWidget.h"

#include "Components/Button.h"

void UMCMainMenuWidget::NativeConstruct()
{
	Super::NativeConstruct();

	if (PlayButton)
	{
		PlayButton->OnClicked.AddDynamic(this, &ThisClass::HandlePlayClicked);
	}

	if (RosterButton)
	{
		RosterButton->OnClicked.AddDynamic(this, &ThisClass::HandleRosterClicked);
	}

	if (ProgressButton)
	{
		ProgressButton->OnClicked.AddDynamic(this, &ThisClass::HandleProgressClicked);
	}

	if (SettingsButton)
	{
		SettingsButton->OnClicked.AddDynamic(this, &ThisClass::HandleSettingsClicked);
	}
}

void UMCMainMenuWidget::NativeDestruct()
{
	if (PlayButton)
	{
		PlayButton->OnClicked.RemoveAll(this);
	}

	if (RosterButton)
	{
		RosterButton->OnClicked.RemoveAll(this);
	}

	if (ProgressButton)
	{
		ProgressButton->OnClicked.RemoveAll(this);
	}

	if (SettingsButton)
	{
		SettingsButton->OnClicked.RemoveAll(this);
	}

	Super::NativeDestruct();
}

void UMCMainMenuWidget::FocusPlayButton()
{
	if (PlayButton)
	{
		PlayButton->SetKeyboardFocus();
	}
}

void UMCMainMenuWidget::HandlePlayClicked()
{
	OnPlayRequested.Broadcast();
}

void UMCMainMenuWidget::HandleRosterClicked()
{
	OnScreenRequested.Broadcast(EMCMenuScreen::Roster);
}

void UMCMainMenuWidget::HandleProgressClicked()
{
	OnScreenRequested.Broadcast(EMCMenuScreen::Progress);
}

void UMCMainMenuWidget::HandleSettingsClicked()
{
	OnScreenRequested.Broadcast(EMCMenuScreen::Settings);
}
