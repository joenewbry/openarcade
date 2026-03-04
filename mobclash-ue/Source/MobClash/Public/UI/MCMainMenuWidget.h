#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "UI/MCMenuTypes.h"
#include "MCMainMenuWidget.generated.h"

class UButton;

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FMCMainMenuPlayRequested);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FMCMainMenuScreenRequested, EMCMenuScreen, Screen);

/**
 * Main menu shell widget with four core actions.
 *
 * Expected widget blueprint bindings:
 * - PlayButton
 * - RosterButton
 * - ProgressButton
 * - SettingsButton
 */
UCLASS(Abstract, BlueprintType)
class MOBCLASH_API UMCMainMenuWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	UPROPERTY(BlueprintAssignable, Category = "Menu")
	FMCMainMenuPlayRequested OnPlayRequested;

	UPROPERTY(BlueprintAssignable, Category = "Menu")
	FMCMainMenuScreenRequested OnScreenRequested;

	UFUNCTION(BlueprintCallable, Category = "Menu")
	void FocusPlayButton();

protected:
	virtual void NativeConstruct() override;
	virtual void NativeDestruct() override;

	UPROPERTY(meta = (BindWidgetOptional), BlueprintReadOnly)
	TObjectPtr<UButton> PlayButton;

	UPROPERTY(meta = (BindWidgetOptional), BlueprintReadOnly)
	TObjectPtr<UButton> RosterButton;

	UPROPERTY(meta = (BindWidgetOptional), BlueprintReadOnly)
	TObjectPtr<UButton> ProgressButton;

	UPROPERTY(meta = (BindWidgetOptional), BlueprintReadOnly)
	TObjectPtr<UButton> SettingsButton;

private:
	UFUNCTION()
	void HandlePlayClicked();

	UFUNCTION()
	void HandleRosterClicked();

	UFUNCTION()
	void HandleProgressClicked();

	UFUNCTION()
	void HandleSettingsClicked();
};
