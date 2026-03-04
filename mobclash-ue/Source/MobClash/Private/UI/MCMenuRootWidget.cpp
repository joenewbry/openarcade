#include "UI/MCMenuRootWidget.h"

#include "Components/WidgetSwitcher.h"
#include "Engine/GameInstance.h"
#include "Game/MCSettingsSubsystem.h"
#include "Kismet/GameplayStatics.h"
#include "UI/MCMainMenuWidget.h"
#include "UI/MCSubMenuWidget.h"

void UMCMenuRootWidget::NativeConstruct()
{
	Super::NativeConstruct();

	if (!RouteToLevel.Contains(EMCMenuScreen::PlayBoard))
	{
		RouteToLevel.Add(EMCMenuScreen::PlayBoard, FName(TEXT("L_BoardPrototype")));
	}

	if (MainMenu)
	{
		MainMenu->OnPlayRequested.AddDynamic(this, &ThisClass::HandlePlayRequested);
		MainMenu->OnScreenRequested.AddDynamic(this, &ThisClass::HandleMainMenuScreenRequested);
	}

	if (RosterScreen)
	{
		RosterScreen->OnBackRequested.AddDynamic(this, &ThisClass::HandleSubMenuBackRequested);
	}

	if (ProgressScreen)
	{
		ProgressScreen->OnBackRequested.AddDynamic(this, &ThisClass::HandleSubMenuBackRequested);
	}

	if (SettingsScreen)
	{
		SettingsScreen->OnBackRequested.AddDynamic(this, &ThisClass::HandleSubMenuBackRequested);
	}

	ReturnToMainMenu();
}

void UMCMenuRootWidget::NativeDestruct()
{
	if (MainMenu)
	{
		MainMenu->OnPlayRequested.RemoveAll(this);
		MainMenu->OnScreenRequested.RemoveAll(this);
	}

	if (RosterScreen)
	{
		RosterScreen->OnBackRequested.RemoveAll(this);
	}

	if (ProgressScreen)
	{
		ProgressScreen->OnBackRequested.RemoveAll(this);
	}

	if (SettingsScreen)
	{
		SettingsScreen->OnBackRequested.RemoveAll(this);
	}

	Super::NativeDestruct();
}

void UMCMenuRootWidget::NavigateToScreen(EMCMenuScreen Screen)
{
	if (Screen == EMCMenuScreen::PlayBoard)
	{
		OpenRouteLevel(Screen);
		return;
	}

	if (Screen == EMCMenuScreen::Settings)
	{
		if (UGameInstance* GameInstance = GetGameInstance())
		{
			if (UMCSettingsSubsystem* SettingsSubsystem = GameInstance->GetSubsystem<UMCSettingsSubsystem>())
			{
				SettingsSubsystem->LoadSettings();
			}
		}
	}

	if (!ScreenSwitcher)
	{
		UE_LOG(LogTemp, Warning, TEXT("MCMenuRootWidget: ScreenSwitcher is not bound; cannot navigate."));
		return;
	}

	const int32 ScreenIndex = GetSwitcherIndexForScreen(Screen);
	if (ScreenIndex == INDEX_NONE)
	{
		UE_LOG(LogTemp, Warning, TEXT("MCMenuRootWidget: No switcher index configured for screen %s"), *UEnum::GetValueAsString(Screen));
		return;
	}

	ScreenSwitcher->SetActiveWidgetIndex(ScreenIndex);
}

void UMCMenuRootWidget::ReturnToMainMenu()
{
	if (ScreenSwitcher)
	{
		ScreenSwitcher->SetActiveWidgetIndex(GetSwitcherIndexForScreen(EMCMenuScreen::Main));
	}

	if (MainMenu)
	{
		MainMenu->FocusPlayButton();
	}
}

void UMCMenuRootWidget::HandlePlayRequested()
{
	OpenRouteLevel(EMCMenuScreen::PlayBoard);
}

void UMCMenuRootWidget::HandleMainMenuScreenRequested(EMCMenuScreen Screen)
{
	NavigateToScreen(Screen);
}

void UMCMenuRootWidget::HandleSubMenuBackRequested(EMCMenuScreen FromScreen)
{
	if (FromScreen == EMCMenuScreen::Settings)
	{
		if (UGameInstance* GameInstance = GetGameInstance())
		{
			if (UMCSettingsSubsystem* SettingsSubsystem = GameInstance->GetSubsystem<UMCSettingsSubsystem>())
			{
				SettingsSubsystem->SaveSettings();
			}
		}
	}

	ReturnToMainMenu();
}

void UMCMenuRootWidget::OpenRouteLevel(EMCMenuScreen Screen)
{
	const FName* LevelName = RouteToLevel.Find(Screen);
	if (!LevelName || LevelName->IsNone())
	{
		UE_LOG(LogTemp, Warning, TEXT("MCMenuRootWidget: Missing route mapping for %s"), *UEnum::GetValueAsString(Screen));
		return;
	}

	UGameplayStatics::OpenLevel(this, *LevelName, bOpenLevelAbsolute);
}

int32 UMCMenuRootWidget::GetSwitcherIndexForScreen(EMCMenuScreen Screen) const
{
	// Expected switcher order in WBP_MenuRoot:
	// 0 = Main, 1 = Roster, 2 = Progress, 3 = Settings
	switch (Screen)
	{
	case EMCMenuScreen::Main:
		return 0;
	case EMCMenuScreen::Roster:
		return 1;
	case EMCMenuScreen::Progress:
		return 2;
	case EMCMenuScreen::Settings:
		return 3;
	default:
		return INDEX_NONE;
	}
}
