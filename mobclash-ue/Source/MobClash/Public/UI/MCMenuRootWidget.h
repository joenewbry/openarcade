#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "UI/MCMenuTypes.h"
#include "MCMenuRootWidget.generated.h"

class UMCMainMenuWidget;
class UMCSubMenuWidget;
class UWidgetSwitcher;

/**
 * Top-level UMG shell that routes menu button events and handles Play->Board transition.
 *
 * Expected widget blueprint bindings:
 * - ScreenSwitcher (index 0 = Main)
 * - MainMenu
 * - RosterScreen
 * - ProgressScreen
 * - SettingsScreen
 */
UCLASS(Abstract, BlueprintType)
class MOBCLASH_API UMCMenuRootWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	/**
	 * Navigation map from logical screen route to level name.
	 * Populate PlayBoard with board placeholder map (default: L_BoardPrototype).
	 */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Navigation")
	TMap<EMCMenuScreen, FName> RouteToLevel;

	/** If true, opens level with absolute URL behavior. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Navigation")
	bool bOpenLevelAbsolute = false;

	UFUNCTION(BlueprintCallable, Category = "Menu")
	void NavigateToScreen(EMCMenuScreen Screen);

	UFUNCTION(BlueprintCallable, Category = "Menu")
	void ReturnToMainMenu();

protected:
	virtual void NativeConstruct() override;
	virtual void NativeDestruct() override;

	UPROPERTY(meta = (BindWidgetOptional), BlueprintReadOnly)
	TObjectPtr<UWidgetSwitcher> ScreenSwitcher;

	UPROPERTY(meta = (BindWidgetOptional), BlueprintReadOnly)
	TObjectPtr<UMCMainMenuWidget> MainMenu;

	UPROPERTY(meta = (BindWidgetOptional), BlueprintReadOnly)
	TObjectPtr<UMCSubMenuWidget> RosterScreen;

	UPROPERTY(meta = (BindWidgetOptional), BlueprintReadOnly)
	TObjectPtr<UMCSubMenuWidget> ProgressScreen;

	UPROPERTY(meta = (BindWidgetOptional), BlueprintReadOnly)
	TObjectPtr<UMCSubMenuWidget> SettingsScreen;

private:
	UFUNCTION()
	void HandlePlayRequested();

	UFUNCTION()
	void HandleMainMenuScreenRequested(EMCMenuScreen Screen);

	UFUNCTION()
	void HandleSubMenuBackRequested(EMCMenuScreen FromScreen);

	void OpenRouteLevel(EMCMenuScreen Screen);
	int32 GetSwitcherIndexForScreen(EMCMenuScreen Screen) const;
};
